// NotesSection component for the ChannelSelector popup
// Allows users to add/edit their note and view other users' notes

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { safeSendMessage, isExtensionContextValid } from '../shared/messaging';

interface User {
  id: string;
  discord_id: string;
  display_name: string;
  avatar: string | null;
}

interface Note {
  id: string;
  note_text: string;
  author_name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    display_name: string;
    discord_avatar: string | null;
  };
}

interface NotesSectionProps {
  contentId: string | null; // UUID of the content in database
  currentUser: User | null;
  onAuthRequired: () => void;
  embedded?: boolean; // When true, hide collapsible header and default to expanded
  pendingNote?: string; // Draft note before content is saved
  onPendingNoteChange?: (text: string) => void; // Callback for draft note changes
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function NotesSection({ contentId, currentUser, onAuthRequired, embedded = false, pendingNote, onPendingNoteChange }: NotesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(embedded);
  const [notes, setNotes] = useState<Note[]>([]);
  const [myNoteText, setMyNoteText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [hasExistingNote, setHasExistingNote] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const MAX_CHARS = 280;
  const debouncedNoteText = useDebounce(myNoteText, 1000);

  // Fetch notes when expanded and contentId is available
  useEffect(() => {
    if (isExpanded && contentId && currentUser) {
      fetchNotes();
    }
  }, [isExpanded, contentId, currentUser]);

  // Auto-save when debounced text changes
  useEffect(() => {
    if (
      debouncedNoteText &&
      debouncedNoteText.trim() &&
      contentId &&
      currentUser &&
      hasExistingNote !== (debouncedNoteText.trim().length > 0)
    ) {
      // Only auto-save if there's actual content and it changed
      saveNote(debouncedNoteText);
    }
  }, [debouncedNoteText]);

  const fetchNotes = async () => {
    if (!contentId || !isExtensionContextValid()) return;

    setIsLoading(true);
    try {
      const response = await safeSendMessage<{ success: boolean; data: { data: Note[]; my_note: Note | null } }>({
        action: 'getNotes',
        data: { contentId },
      });

      if (response?.success && response.data) {
        const allNotes = response.data.data || [];
        setNotes(allNotes);

        // Find current user's note
        const myNote = response.data.my_note;
        if (myNote) {
          setMyNoteText(myNote.note_text);
          setHasExistingNote(true);
        } else {
          setMyNoteText('');
          setHasExistingNote(false);
        }
      }
    } catch (error) {
      console.error('530: Failed to fetch notes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveNote = async (text: string) => {
    if (!contentId || !currentUser || !text.trim() || !isExtensionContextValid()) return;

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      const response = await safeSendMessage<{ success: boolean }>({
        action: 'saveUserNote',
        data: { contentId, noteText: text.trim() },
      });

      if (response?.success) {
        setSaveStatus('saved');
        setHasExistingNote(true);
        // Refresh notes to get updated list
        fetchNotes();
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('530: Failed to save note:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteNote = async () => {
    if (!contentId || !currentUser || !isExtensionContextValid()) return;

    if (!confirm('Delete your note?')) return;

    try {
      const response = await safeSendMessage<{ success: boolean }>({
        action: 'deleteUserNote',
        data: { contentId },
      });

      if (response?.success) {
        setMyNoteText('');
        setHasExistingNote(false);
        fetchNotes();
      }
    } catch (error) {
      console.error('530: Failed to delete note:', error);
    }
  };

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    if (text.length <= MAX_CHARS) {
      setMyNoteText(text);
      setSaveStatus('idle');
    }
  };

  const handleSaveClick = () => {
    if (myNoteText.trim()) {
      saveNote(myNoteText);
    }
  };

  const otherNotes = notes.filter((note) => note.user_id !== currentUser?.id);
  const noteCount = notes.length;
  const charCount = myNoteText.length;

  return (
    <div className={`ft-notes ${embedded ? 'embedded' : ''}`}>
      {/* Header - hidden when embedded */}
      {!embedded && (
        <div
          className={`ft-notes-header ${isExpanded ? 'expanded' : ''}`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className="arrow">{isExpanded ? '▼' : '▶'}</span>
          <span className="label">Notes</span>
          {noteCount > 0 && <span className="badge">{noteCount}</span>}
        </div>
      )}

      {/* Content - only when expanded (or always when embedded) */}
      {(isExpanded || embedded) && (
        <div className="ft-notes-content">
          {isLoading ? (
            <div className="ft-notes-loading">Loading notes...</div>
          ) : !currentUser ? (
            /* Auth prompt for unauthenticated users */
            <div className="ft-auth-prompt">
              <button className="ft-discord-btn" onClick={onAuthRequired}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
                Sign in with Discord
              </button>
              <p style={{ fontSize: '11px', color: '#71717a', marginTop: '8px' }}>to add notes</p>
            </div>
          ) : !contentId ? (
            /* Draft note UI when content not saved yet */
            <div className="ft-draft-note">
              <div className="ft-draft-label">Draft Your Note</div>
              <textarea
                className="ft-my-note-textarea"
                placeholder="Write a note (saves with content)..."
                value={pendingNote || ''}
                onChange={(e) => {
                  if (e.target.value.length <= MAX_CHARS) {
                    onPendingNoteChange?.(e.target.value);
                  }
                }}
                maxLength={MAX_CHARS}
              />
              <div className="ft-my-note-footer">
                <div className="ft-note-status-row">
                  <span className={`ft-char-count ${(pendingNote?.length || 0) > MAX_CHARS - 20 ? ((pendingNote?.length || 0) >= MAX_CHARS ? 'at-limit' : 'near-limit') : ''}`}>
                    {pendingNote?.length || 0}/{MAX_CHARS}
                  </span>
                </div>
              </div>
              <p className="ft-draft-hint">Your note will be saved when you click Done</p>
            </div>
          ) : (
            <>
              {/* My Note Editor */}
              <div className="ft-my-note">
                <div className="ft-my-note-label">Your Note</div>
                <textarea
                  ref={textareaRef}
                  className="ft-my-note-textarea"
                  placeholder="Add your note..."
                  value={myNoteText}
                  onChange={handleNoteChange}
                  maxLength={MAX_CHARS}
                />
                <div className="ft-my-note-footer">
                  {hasExistingNote && (
                    <button className="ft-note-delete" onClick={deleteNote} title="Delete note">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  )}
                  <div className="ft-note-status-row">
                    <span
                      className={`ft-note-status ${saveStatus}`}
                      style={{ visibility: saveStatus === 'idle' ? 'hidden' : 'visible' }}
                    >
                      {saveStatus === 'saving' && 'Saving...'}
                      {saveStatus === 'saved' && '✓'}
                      {saveStatus === 'error' && 'Error'}
                    </span>
                    <span
                      className={`ft-char-count ${charCount > MAX_CHARS - 20 ? (charCount >= MAX_CHARS ? 'at-limit' : 'near-limit') : ''}`}
                    >
                      {charCount}/{MAX_CHARS}
                    </span>
                    {!hasExistingNote && myNoteText.trim() && (
                      <button className="ft-save-btn" onClick={handleSaveClick} disabled={isSaving}>
                        Save
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Other Users' Notes */}
              {otherNotes.length > 0 && (
                <>
                  <div className="ft-other-notes-label">Other Notes ({otherNotes.length})</div>
                  <div className="ft-other-notes-list">
                    {otherNotes.map((note) => (
                      <div key={note.id} className="ft-note-card">
                        <div className="ft-note-card-header">
                          {note.user?.discord_avatar ? (
                            <img src={note.user.discord_avatar} alt="" className="ft-note-avatar" />
                          ) : (
                            <div className="ft-note-avatar-placeholder">
                              {note.author_name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="ft-note-username">@{note.author_name}</span>
                        </div>
                        <div className="ft-note-text">{note.note_text}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {notes.length === 0 && !hasExistingNote && (
                <div className="ft-notes-empty">No notes yet. Be the first to add one!</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// CSS styles to add to the popup styles
export const notesStyles = `
  /* Notes Section Container */
  .ft-notes {
    border-top: 1px solid #27272a;
    margin-top: 8px;
  }

  /* Notes Section Header */
  .ft-notes-header {
    display: flex;
    align-items: center;
    padding: 8px 10px;
    cursor: pointer;
    color: #a1a1aa;
    transition: background 0.15s ease;
    user-select: none;
  }

  .ft-notes-header:hover {
    background: #27272a;
  }

  .ft-notes-header .arrow {
    font-size: 8px;
    margin-right: 6px;
    transition: transform 0.2s ease;
  }

  .ft-notes-header .label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .ft-notes-header .badge {
    margin-left: 6px;
    padding: 2px 6px;
    background: #3f3f46;
    border-radius: 10px;
    font-size: 10px;
    color: #e4e4e7;
  }

  /* Notes Content */
  .ft-notes-content {
    padding: 8px 10px;
  }

  .ft-notes-loading,
  .ft-notes-empty {
    font-size: 11px;
    color: #52525b;
    text-align: center;
    padding: 12px 0;
  }

  /* My Note Editor */
  .ft-my-note {
    margin-bottom: 8px;
  }

  .ft-my-note-label {
    font-size: 10px;
    font-weight: 600;
    color: #71717a;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .ft-my-note-textarea {
    width: 100%;
    min-height: 60px;
    max-height: 120px;
    padding: 8px;
    background: #27272a;
    border: 1px solid #3f3f46;
    border-radius: 6px;
    color: #e4e4e7;
    font-size: 12px;
    font-family: inherit;
    resize: vertical;
    line-height: 1.4;
  }

  .ft-my-note-textarea:focus {
    outline: none;
    border-color: #667eea;
  }

  .ft-my-note-textarea::placeholder {
    color: #52525b;
  }

  .ft-my-note-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 6px;
  }

  .ft-note-delete {
    background: none;
    border: none;
    color: #71717a;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    display: flex;
    align-items: center;
  }

  .ft-note-delete:hover {
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }

  .ft-note-status-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
  }

  .ft-note-status {
    font-size: 11px;
    color: #71717a;
  }

  .ft-note-status.saving {
    color: #f59e0b;
  }

  .ft-note-status.saved {
    color: #10b981;
  }

  .ft-note-status.error {
    color: #ef4444;
  }

  .ft-char-count {
    font-size: 11px;
    color: #52525b;
  }

  .ft-char-count.near-limit {
    color: #f59e0b;
  }

  .ft-char-count.at-limit {
    color: #ef4444;
  }

  .ft-save-btn {
    padding: 4px 10px;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
  }

  .ft-save-btn:hover {
    background: #5a67d8;
  }

  .ft-save-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Other Notes List */
  .ft-other-notes-label {
    font-size: 10px;
    font-weight: 600;
    color: #71717a;
    text-transform: uppercase;
    margin: 8px 0 6px;
    padding-top: 8px;
    border-top: 1px solid #27272a;
  }

  .ft-other-notes-list {
    max-height: 150px;
    overflow-y: auto;
  }

  .ft-note-card {
    padding: 8px;
    background: #1f1f23;
    border-radius: 6px;
    margin-bottom: 6px;
  }

  .ft-note-card:last-child {
    margin-bottom: 0;
  }

  .ft-note-card-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }

  .ft-note-avatar {
    width: 18px;
    height: 18px;
    border-radius: 50%;
  }

  .ft-note-avatar-placeholder {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #3f3f46;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
    color: #a1a1aa;
  }

  .ft-note-username {
    font-size: 11px;
    font-weight: 600;
    color: #a1a1aa;
  }

  .ft-note-text {
    font-size: 12px;
    color: #e4e4e7;
    line-height: 1.4;
    word-break: break-word;
  }

  /* Auth Prompt */
  .ft-auth-prompt {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px;
    text-align: center;
  }

  .ft-discord-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: #5865f2;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .ft-discord-btn:hover {
    background: #4752c4;
  }
`;
