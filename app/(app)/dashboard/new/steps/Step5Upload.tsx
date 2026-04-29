'use client';

import React, { useState, useCallback } from 'react';
import { useWizardStore } from '../wizardStore';
import { useDropzone } from 'react-dropzone';
import { PipelineStatus } from '../../../../../components/ui/PipelineStatus/PipelineStatus';
import { StatusBadge } from '../../../../../components/shared/StatusBadge';
import { DocumentStatus } from '../../../../../lib/types';
import { UPLOAD_CONFIG } from '../../../../../lib/uploadConfig';
import styles from './Step5Upload.module.css';

interface UploadingFile {
  id: string; 
  name: string;
  size: number;
  status: DocumentStatus | 'UPLOADING' | 'FAILED';
  error?: string;
}

export function Step5Upload() {
  const { files, setFiles } = useWizardStore();
  const [globalError, setGlobalError] = useState<string>('');

  const onDrop = useCallback(async (acceptedFiles: File[], fileRejections: any[]) => {
    setGlobalError('');
    if (fileRejections.length > 0) {
      setGlobalError('Some files were rejected. Ensure they are < 10MB and supported types.');
    }

    for (const file of acceptedFiles) {
      if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
        setGlobalError((prev) => prev ? `${prev}\n${file.name} is too large (>${UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB).` : `${file.name} is too large (>${UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB).`);
        continue;
      }
      
      const tempId = `temp-${Date.now()}-${file.name}`;
      setFiles(prev => [...prev, { id: tempId, file, status: 'PENDING' }]);
    }
  }, [setFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: UPLOAD_CONFIG.MIME_TYPES,
    maxSize: UPLOAD_CONFIG.MAX_FILE_SIZE
  });

  return (
    <div className={styles.uploadContainer}>
      <div>
        <h2 style={{ marginBottom: '16px', fontSize: '1.25rem', color: 'var(--text)' }}>Initial Documents</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '8px', fontSize: '0.875rem' }}>Upload initial files to bootstrap your RAG. Max {UPLOAD_CONFIG.MAX_FILE_SIZE_MB}MB per file ({UPLOAD_CONFIG.getAcceptString()}).</p>
      </div>

      {globalError && <div className={styles.errorText}>{globalError}</div>}
      
      <div {...getRootProps()} className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''}`}>
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className={styles.dropzoneText}>Drop the files here ...</p>
        ) : (
          <p className={styles.dropzoneText}>Drag & drop files here, or click to browse</p>
        )}
      </div>

      <div className={styles.fileList}>
        {files.map(f => {
          if (f.status === 'PENDING' || f.status === 'UPLOADING' || f.status === 'FAILED') {
            return (
              <div key={f.id} className={styles.fileRow}>
                <div className={styles.fileInfo}>
                  <span className={styles.fileName}>{f.file.name}</span>
                  <span className={styles.fileSize}>{(f.file.size / 1024 / 1024).toFixed(2)} MB {f.error && <span style={{color: '#ef4444'}}> - {f.error}</span>}</span>
                </div>
                <div style={{ color: f.status === 'FAILED' ? '#ef4444' : 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>
                  {f.status === 'FAILED' ? 'Failed' : f.status === 'UPLOADING' ? 'Uploading...' : 'Ready to upload'}
                </div>
              </div>
            );
          }

          return (
            <div key={f.id} className={styles.fileWrapper}>
              <div className={styles.fileRow}>
                 <div className={styles.fileInfo}>
                   <span className={styles.fileName}>{f.file.name}</span>
                   <span className={styles.fileSize}>{(f.file.size / 1024 / 1024).toFixed(2)} MB</span>
                 </div>
                 <StatusBadge status={f.status as DocumentStatus} />
              </div>
              {f.documentId && <PipelineStatus documentId={f.documentId} onComplete={() => setFiles(prev => prev.map(file => file.id === f.id ? { ...file, status: 'READY' } : file))} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
