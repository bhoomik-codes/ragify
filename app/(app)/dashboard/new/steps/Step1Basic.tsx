'use client';

import React, { useState } from 'react';
import { useWizardStore } from '../wizardStore';
import { Input } from '../../../../../components/ui/Input';
import EmojiPicker from 'emoji-picker-react';

export function Step1Basic() {
  const { data, updateData } = useWizardStore();
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div>
      <h2 style={{ marginBottom: '24px', fontSize: '1.25rem', color: 'var(--text)' }}>Basic Information</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input 
          label="Pipeline Name" 
          placeholder="e.g. Acme DocBot" 
          value={data.name}
          onChange={(e) => updateData({ name: e.target.value })}
        />
        <Input 
          label="Description" 
          placeholder="Optional description" 
          value={data.description}
          onChange={(e) => updateData({ description: e.target.value })}
        />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', position: 'relative' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>Emoji Icon</label>
          <div 
            onClick={() => setShowPicker(p => !p)}
            style={{ 
              width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--bg-card)', 
              cursor: 'pointer', fontSize: '1.5rem'
            }}
          >
            {data.emoji || '🤖'}
          </div>
          {showPicker && (
            <div style={{ position: 'absolute', top: '70px', zIndex: 100 }}>
              <div 
                style={{ position: 'fixed', inset: 0, zIndex: -1 }} 
                onClick={() => setShowPicker(false)} 
              />
              <EmojiPicker 
                onEmojiClick={(emojiData) => {
                  updateData({ emoji: emojiData.emoji });
                  setShowPicker(false);
                }} 
              />
            </div>
          )}
        </div>
        <Input 
          label="Tags (comma separated)" 
          placeholder="sales, support" 
          value={data.tags.join(', ')}
          onChange={(e) => updateData({ tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
        />
      </div>
    </div>
  );
}
