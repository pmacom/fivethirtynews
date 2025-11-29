// 530 ChannelSelector - Channel selection UI with auto-save
console.log('530: Loading ChannelSelector...');

/**
 * ChannelSelector - Main UI for selecting channels when tagging content
 * Uses SmartPopover for positioning and sub-menus
 * New two-column layout with categories on left, tags/notes tabs on right
 */
class ChannelSelector {
  constructor(options = {}) {
    this.postData = options.postData || {};
    this.existingChannels = options.existingChannels || [];
    this.existingPrimaryChannel = options.existingPrimaryChannel || null;
    this.existingTags = options.existingTags || [];
    this.existingNotes = options.notes || '';
    this.onSave = options.onSave || null;
    this.onCancel = options.onCancel || null;

    // Channel state
    this.selectedChannels = new Set(this.existingChannels);
    this.primaryChannel = this.existingPrimaryChannel || (this.existingChannels[0] || null);
    this.channelGroups = [];
    this.channelsMap = new Map(); // slug -> channel object
    this.loading = true;
    this.saving = false;
    this.activeGroupId = null;

    // Tags state (NEW)
    this.availableTags = [];
    this.selectedTags = new Set(this.existingTags);
    this.tagsLoading = true;

    // Notes state (NEW)
    this.noteText = this.existingNotes;

    // UI state (NEW)
    this.activeTab = 'tags'; // 'tags' or 'notes'

    // Popovers
    this.mainPopover = null;
    this.subPopover = null;

    // Load channel data and tags
    this._loadChannelGroups();
    this._loadTags();
  }

  /**
   * Show the selector anchored to an element
   */
  show(anchorElement) {
    this.mainPopover = new window.SmartPopover({
      content: () => this._renderMain(),
      placement: 'bottom',
      alignment: 'start',
      className: 'five-thirty-channel-selector',
      onClose: () => {
        this._closeSubPopover();
        if (this.onCancel && this.selectedChannels.size === 0) {
          this.onCancel();
        }
      }
    });

    this.mainPopover.open(anchorElement);
  }

  /**
   * Close the selector
   */
  close() {
    this._closeSubPopover();
    if (this.mainPopover) {
      this.mainPopover.close();
      this.mainPopover = null;
    }
  }

  // ===== Data Loading =====

  async _loadChannelGroups() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getChannelGroups'
      });

      if (response.success) {
        this.channelGroups = response.data;

        // Build channels map for quick lookup
        this.channelGroups.forEach(group => {
          group.channels.forEach(channel => {
            this.channelsMap.set(channel.slug, {
              ...channel,
              groupId: group.id,
              groupSlug: group.slug,
              groupName: group.name,
              groupIcon: group.icon
            });
          });
        });

        this.loading = false;
        this._updateMainContent();
      } else {
        console.error('530: Failed to load channel groups', response.error);
        this.loading = false;
        this._updateMainContent();
      }
    } catch (error) {
      console.error('530: Error loading channel groups', error);
      this.loading = false;
      this._updateMainContent();
    }
  }

  /**
   * Load available tags for autocomplete (preloaded on open)
   */
  async _loadTags() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'fetchTags'
      });

      if (response.success) {
        this.availableTags = response.tags || [];
        console.log('530: Loaded', this.availableTags.length, 'tags for autocomplete');
      } else {
        console.error('530: Failed to load tags', response.error);
        this.availableTags = [];
      }
    } catch (error) {
      console.error('530: Error loading tags', error);
      this.availableTags = [];
    } finally {
      this.tagsLoading = false;
      this._updateMainContent();
    }
  }

  /**
   * Filter tags based on search query (min 3 chars)
   */
  _filterTags(query) {
    if (!query || query.length < 3) return [];
    const lower = query.toLowerCase();
    return this.availableTags
      .filter(t =>
        (t.name && t.name.toLowerCase().includes(lower)) ||
        (t.slug && t.slug.toLowerCase().includes(lower))
      )
      .filter(t => !this.selectedTags.has(t.slug)) // Exclude already selected
      .slice(0, 10);
  }

  /**
   * Add a tag to selected tags
   */
  _addTag(tagSlug, tagName) {
    if (this.selectedTags.has(tagSlug)) return;
    this.selectedTags.add(tagSlug);
    this._updateMainContent();
    this._autoSave();
  }

  /**
   * Remove a tag from selected tags
   */
  _removeTag(tagSlug) {
    if (!this.selectedTags.has(tagSlug)) return;
    this.selectedTags.delete(tagSlug);
    this._updateMainContent();
    this._autoSave();
  }

  /**
   * Update notes text
   */
  _updateNotes(text) {
    this.noteText = text;
    // Don't auto-save on every keystroke, will save on Done
  }

  /**
   * Switch active tab
   */
  _switchTab(tab) {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this._updateMainContent();
  }

  // ===== Channel Selection =====

  async selectChannel(channelSlug) {
    if (this.selectedChannels.has(channelSlug)) return;

    this.selectedChannels.add(channelSlug);

    // First selection becomes primary
    if (!this.primaryChannel) {
      this.primaryChannel = channelSlug;
    }

    this._updateMainContent();
    this._updateSubPopoverContent();
    await this._autoSave();
  }

  async deselectChannel(channelSlug) {
    if (!this.selectedChannels.has(channelSlug)) return;

    this.selectedChannels.delete(channelSlug);

    // Update primary if we removed it
    if (this.primaryChannel === channelSlug) {
      this.primaryChannel = this.selectedChannels.size > 0
        ? Array.from(this.selectedChannels)[0]
        : null;
    }

    this._updateMainContent();
    this._updateSubPopoverContent();
    await this._autoSave();
  }

  setPrimary(channelSlug) {
    if (!this.selectedChannels.has(channelSlug)) return;
    if (this.primaryChannel === channelSlug) return;

    this.primaryChannel = channelSlug;
    this._updateMainContent();
    this._updateSubPopoverContent();
    this._autoSave();
  }

  // ===== Auto-Save =====

  async _autoSave() {
    if (this.saving) return;
    if (this.selectedChannels.size === 0 && this.selectedTags.size === 0) return;

    this.saving = true;

    try {
      const contentData = {
        platform: this.postData.platform || 'twitter',
        platformContentId: this.postData.platformContentId || this.postData.tweetId,
        url: this.postData.url,
        channels: Array.from(this.selectedChannels),
        primaryChannel: this.primaryChannel,
        tags: Array.from(this.selectedTags), // Include selected tags
        title: this.postData.title,
        description: this.postData.description,
        content: this.postData.content || this.postData.tweetText,
        author: this.postData.author,
        authorUsername: this.postData.authorUsername,
        authorUrl: this.postData.authorUrl,
        authorAvatarUrl: this.postData.authorAvatarUrl,
        thumbnailUrl: this.postData.thumbnailUrl,
        mediaAssets: this.postData.mediaAssets,
        metadata: this.postData.metadata,
        contentCreatedAt: this.postData.contentCreatedAt
      };

      const response = await chrome.runtime.sendMessage({
        action: 'updateContentChannels',
        data: contentData
      });

      if (response.success) {
        if (this.onSave) {
          this.onSave({
            ...response.data,
            channels: Array.from(this.selectedChannels),
            primaryChannel: this.primaryChannel,
            tags: Array.from(this.selectedTags)
          });
        }
      } else {
        console.error('530: Failed to save channels', response.error);
      }
    } catch (error) {
      console.error('530: Error saving channels', error);
    } finally {
      this.saving = false;
    }
  }

  // ===== Rendering =====

  _renderMain() {
    return `
      <div class="five-thirty-cs-main">
        <div class="five-thirty-cs-body">
          ${this._renderCategoriesColumn()}
          ${this._renderRightPanel()}
        </div>
        ${this._renderSelectedArea()}
        ${this._renderDoneButton()}
      </div>
    `;
  }

  _renderDoneButton() {
    const hasContent = this.selectedChannels.size > 0 || this.selectedTags.size > 0;
    return `
      <div class="five-thirty-cs-done">
        <button class="five-thirty-cs-done-btn" ${!hasContent ? 'disabled' : ''}>
          Done
        </button>
      </div>
    `;
  }

  _renderSelectedArea() {
    if (this.loading) {
      return `
        <div class="five-thirty-cs-selected">
          <div class="five-thirty-cs-loading">Loading channels...</div>
        </div>
      `;
    }

    if (this.selectedChannels.size === 0) {
      return `
        <div class="five-thirty-cs-selected">
          <div class="five-thirty-cs-empty">Click a category to add channels</div>
        </div>
      `;
    }

    const chips = Array.from(this.selectedChannels).map(slug => {
      const channel = this.channelsMap.get(slug);
      const isPrimary = slug === this.primaryChannel;
      const name = channel ? channel.name : slug;
      const icon = channel ? channel.icon : '';

      return `
        <button
          class="five-thirty-cs-chip ${isPrimary ? 'five-thirty-cs-chip--primary' : ''}"
          data-slug="${this._escapeAttr(slug)}"
          title="${isPrimary ? 'Primary channel' : 'Click to make primary'}"
        >
          ${isPrimary ? '<span class="five-thirty-cs-chip-star">★</span>' : ''}
          ${icon ? `<span class="five-thirty-cs-chip-icon">${icon}</span>` : ''}
          <span class="five-thirty-cs-chip-name">${this._escapeHtml(name)}</span>
          <span class="five-thirty-cs-chip-remove" data-action="remove" data-slug="${this._escapeAttr(slug)}">×</span>
        </button>
      `;
    }).join('');

    return `
      <div class="five-thirty-cs-selected">
        <div class="five-thirty-cs-chips">${chips}</div>
      </div>
    `;
  }

  /**
   * Render the left column with vertical category buttons
   */
  _renderCategoriesColumn() {
    if (this.loading) {
      return `
        <div class="five-thirty-cs-categories-column">
          <div class="five-thirty-cs-loading">Loading...</div>
        </div>
      `;
    }

    const buttons = this.channelGroups.map(group => {
      const isActive = this.activeGroupId === group.id;
      const hasSelection = this._groupHasSelection(group);
      const hasPrimary = this._groupHasPrimary(group);

      return `
        <button
          class="five-thirty-cs-category-btn ${isActive ? 'five-thirty-cs-category-btn--active' : ''} ${hasSelection ? 'five-thirty-cs-category-btn--has-selection' : ''} ${hasPrimary ? 'five-thirty-cs-category-btn--has-primary' : ''}"
          data-group-id="${group.id}"
          title="${this._escapeAttr(group.name)}"
        >
          <span class="five-thirty-cs-category-icon">${group.icon || '📁'}</span>
          <span class="five-thirty-cs-category-name">${this._escapeHtml(group.name)}</span>
          ${hasPrimary ? '<span class="five-thirty-cs-category-star">★</span>' : ''}
          ${hasSelection && !hasPrimary ? '<span class="five-thirty-cs-category-dot"></span>' : ''}
        </button>
      `;
    }).join('');

    return `
      <div class="five-thirty-cs-categories-column">
        ${buttons}
      </div>
    `;
  }

  /**
   * Render the right panel with tabs (Tags / Notes)
   */
  _renderRightPanel() {
    return `
      <div class="five-thirty-cs-right-panel">
        <div class="five-thirty-cs-tab-bar">
          <button class="five-thirty-cs-tab-btn ${this.activeTab === 'tags' ? 'five-thirty-cs-tab-btn--active' : ''}" data-tab="tags">
            Additional Tags
          </button>
          <button class="five-thirty-cs-tab-btn ${this.activeTab === 'notes' ? 'five-thirty-cs-tab-btn--active' : ''}" data-tab="notes">
            Notes
          </button>
        </div>
        <div class="five-thirty-cs-tab-content">
          ${this.activeTab === 'tags' ? this._renderTagsTab() : this._renderNotesTab()}
        </div>
      </div>
    `;
  }

  /**
   * Render the Additional Tags tab content
   */
  _renderTagsTab() {
    const selectedTagsHtml = this.selectedTags.size > 0
      ? Array.from(this.selectedTags).map(slug => {
          const tag = this.availableTags.find(t => t.slug === slug);
          const name = tag ? tag.name : slug;
          return `
            <span class="five-thirty-cs-tag-chip">
              <span class="five-thirty-cs-tag-chip-name">${this._escapeHtml(name)}</span>
              <button class="five-thirty-cs-tag-chip-remove" data-tag="${this._escapeAttr(slug)}">×</button>
            </span>
          `;
        }).join('')
      : `<div class="five-thirty-cs-tags-empty">No tags added yet</div>`;

    return `
      <div class="five-thirty-cs-tag-input-container">
        <input
          type="text"
          class="five-thirty-cs-tag-search-input"
          placeholder="Search tags (type 3+ chars)..."
          autocomplete="off"
        >
        <div class="five-thirty-cs-autocomplete-dropdown hidden"></div>
      </div>
      <div class="five-thirty-cs-selected-tags">
        ${selectedTagsHtml}
      </div>
      ${this.tagsLoading ? '<div class="five-thirty-cs-tags-hint">Loading tags...</div>' : ''}
    `;
  }

  /**
   * Render the Notes tab content
   */
  _renderNotesTab() {
    return `
      <textarea
        class="five-thirty-cs-notes-textarea"
        placeholder="Add notes about this content..."
      >${this._escapeHtml(this.noteText)}</textarea>
      <div class="five-thirty-cs-notes-hint">Notes are saved with the content.</div>
    `;
  }

  // Keep old _renderGroupBar for backward compatibility with sub-popover
  _renderGroupBar() {
    if (this.loading) {
      return '<div class="five-thirty-cs-groups"></div>';
    }

    const buttons = this.channelGroups.map(group => {
      const isActive = this.activeGroupId === group.id;
      const hasSelection = this._groupHasSelection(group);
      const hasPrimary = this._groupHasPrimary(group);

      return `
        <button
          class="five-thirty-cs-group-btn ${isActive ? 'five-thirty-cs-group-btn--active' : ''} ${hasSelection ? 'five-thirty-cs-group-btn--has-selection' : ''} ${hasPrimary ? 'five-thirty-cs-group-btn--has-primary' : ''}"
          data-group-id="${group.id}"
          title="${this._escapeAttr(group.name)}"
        >
          <span class="five-thirty-cs-group-icon">${group.icon || '📁'}</span>
          ${hasPrimary ? '<span class="five-thirty-cs-group-star">★</span>' : ''}
          ${hasSelection && !hasPrimary ? '<span class="five-thirty-cs-group-dot"></span>' : ''}
        </button>
      `;
    }).join('');

    return `
      <div class="five-thirty-cs-groups">
        ${buttons}
      </div>
    `;
  }

  _renderSubPopover(group) {
    const channels = group.channels.map(channel => {
      const isSelected = this.selectedChannels.has(channel.slug);
      const isPrimary = channel.slug === this.primaryChannel;

      return `
        <button
          class="five-thirty-cs-channel ${isSelected ? 'five-thirty-cs-channel--selected' : ''}"
          data-slug="${this._escapeAttr(channel.slug)}"
        >
          <span class="five-thirty-cs-channel-check">${isSelected ? '✓' : ''}</span>
          <span class="five-thirty-cs-channel-icon">${channel.icon || '#'}</span>
          <div class="five-thirty-cs-channel-info">
            <span class="five-thirty-cs-channel-name">${this._escapeHtml(channel.name)}</span>
            ${channel.description ? `<span class="five-thirty-cs-channel-desc">${this._escapeHtml(channel.description)}</span>` : ''}
          </div>
          ${isSelected ? `
            <button
              class="five-thirty-cs-channel-star ${isPrimary ? 'five-thirty-cs-channel-star--active' : ''}"
              data-action="primary"
              data-slug="${this._escapeAttr(channel.slug)}"
              title="${isPrimary ? 'Primary channel' : 'Make primary'}"
            >★</button>
          ` : ''}
        </button>
      `;
    }).join('');

    return `
      <div class="five-thirty-cs-sub">
        <div class="five-thirty-cs-sub-header">
          <span class="five-thirty-cs-sub-icon">${group.icon || '📁'}</span>
          <span class="five-thirty-cs-sub-name">${this._escapeHtml(group.name)}</span>
        </div>
        <div class="five-thirty-cs-sub-channels">
          ${channels}
        </div>
      </div>
    `;
  }

  // ===== UI Updates =====

  _updateMainContent() {
    if (this.mainPopover && this.mainPopover.popover) {
      this.mainPopover.popover.innerHTML = this._renderMain();
      this._attachMainListeners();
    }
  }

  _updateSubPopoverContent() {
    if (this.subPopover && this.subPopover.popover && this.activeGroupId) {
      const group = this.channelGroups.find(g => g.id === this.activeGroupId);
      if (group) {
        this.subPopover.popover.innerHTML = this._renderSubPopover(group);
        this._attachSubListeners();
      }
    }
  }

  _attachMainListeners() {
    if (!this.mainPopover || !this.mainPopover.popover) return;

    const container = this.mainPopover.popover;

    // Category buttons (left column)
    container.querySelectorAll('.five-thirty-cs-category-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const groupId = btn.dataset.groupId;
        this._toggleGroupPopover(groupId, btn);
      });
    });

    // Legacy group buttons (for backward compat)
    container.querySelectorAll('.five-thirty-cs-group-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const groupId = btn.dataset.groupId;
        this._toggleGroupPopover(groupId, btn);
      });
    });

    // Tab buttons
    container.querySelectorAll('.five-thirty-cs-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tab = btn.dataset.tab;
        this._switchTab(tab);
      });
    });

    // Tag search input
    const tagInput = container.querySelector('.five-thirty-cs-tag-search-input');
    if (tagInput) {
      tagInput.addEventListener('input', (e) => {
        this._handleTagInput(e);
      });

      // Close dropdown on blur (with delay to allow click)
      tagInput.addEventListener('blur', () => {
        setTimeout(() => {
          const dropdown = container.querySelector('.five-thirty-cs-autocomplete-dropdown');
          if (dropdown) dropdown.classList.add('hidden');
        }, 200);
      });
    }

    // Tag autocomplete dropdown clicks
    const dropdown = container.querySelector('.five-thirty-cs-autocomplete-dropdown');
    if (dropdown) {
      dropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.five-thirty-cs-autocomplete-item');
        if (item) {
          e.stopPropagation();
          const slug = item.dataset.slug;
          const name = item.dataset.name || slug;
          if (slug) {
            this._addTag(slug, name);
            // Clear the input
            const input = container.querySelector('.five-thirty-cs-tag-search-input');
            if (input) input.value = '';
            dropdown.classList.add('hidden');
          }
        }
      });
    }

    // Tag chip remove buttons
    container.querySelectorAll('.five-thirty-cs-tag-chip-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tag = btn.dataset.tag;
        if (tag) this._removeTag(tag);
      });
    });

    // Notes textarea
    const notesTextarea = container.querySelector('.five-thirty-cs-notes-textarea');
    if (notesTextarea) {
      notesTextarea.addEventListener('input', (e) => {
        this._updateNotes(e.target.value);
      });
    }

    // Chip clicks (make primary)
    container.querySelectorAll('.five-thirty-cs-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        // Check if remove button was clicked
        if (e.target.dataset.action === 'remove') {
          e.stopPropagation();
          this.deselectChannel(e.target.dataset.slug);
          return;
        }
        // Otherwise make primary
        const slug = chip.dataset.slug;
        this.setPrimary(slug);
      });
    });

    // Done button
    const doneBtn = container.querySelector('.five-thirty-cs-done-btn');
    if (doneBtn) {
      doneBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.close();
      });
    }
  }

  /**
   * Handle tag input for autocomplete
   */
  _handleTagInput(e) {
    const query = e.target.value.trim();
    const container = this.mainPopover?.popover;
    if (!container) return;

    const dropdown = container.querySelector('.five-thirty-cs-autocomplete-dropdown');
    if (!dropdown) return;

    if (query.length < 3) {
      dropdown.classList.add('hidden');
      return;
    }

    const matches = this._filterTags(query);

    if (matches.length === 0) {
      // Show "Create new tag" option
      dropdown.innerHTML = `
        <div class="five-thirty-cs-autocomplete-item create-new" data-slug="${this._escapeAttr(query)}" data-name="${this._escapeAttr(query)}">
          Create "${this._escapeHtml(query)}"
        </div>
      `;
    } else {
      dropdown.innerHTML = matches.map(t => `
        <div class="five-thirty-cs-autocomplete-item" data-slug="${this._escapeAttr(t.slug)}" data-name="${this._escapeAttr(t.name)}">
          <span>${this._escapeHtml(t.name)}</span>
          <span class="five-thirty-cs-usage-count">(${t.usage_count || 0})</span>
        </div>
      `).join('');
    }

    dropdown.classList.remove('hidden');
  }

  _attachSubListeners() {
    if (!this.subPopover || !this.subPopover.popover) return;

    const container = this.subPopover.popover;

    // Channel buttons
    container.querySelectorAll('.five-thirty-cs-channel').forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Check if star button was clicked
        if (e.target.dataset.action === 'primary') {
          e.stopPropagation();
          this.setPrimary(e.target.dataset.slug);
          return;
        }

        const slug = btn.dataset.slug;
        if (this.selectedChannels.has(slug)) {
          this.deselectChannel(slug);
        } else {
          this.selectChannel(slug);
        }
      });
    });
  }

  _toggleGroupPopover(groupId, anchorBtn) {
    // If clicking same group, close it
    if (this.activeGroupId === groupId && this.subPopover) {
      this._closeSubPopover();
      return;
    }

    // Close existing sub-popover
    this._closeSubPopover();

    // Find the group
    const group = this.channelGroups.find(g => g.id === groupId);
    if (!group) return;

    this.activeGroupId = groupId;

    // Update button states
    this._updateGroupButtonStates();

    // Create sub-popover
    this.subPopover = new window.SmartPopover({
      content: () => this._renderSubPopover(group),
      placement: 'bottom',
      alignment: 'start',
      className: 'five-thirty-channel-selector-sub',
      parentPopover: this.mainPopover,
      onClose: () => {
        this.activeGroupId = null;
        this._updateGroupButtonStates();
      }
    });

    this.subPopover.open(anchorBtn);
    this._attachSubListeners();
  }

  _closeSubPopover() {
    if (this.subPopover) {
      this.subPopover.close();
      this.subPopover = null;
    }
    this.activeGroupId = null;
    this._updateGroupButtonStates();
  }

  _updateGroupButtonStates() {
    if (!this.mainPopover || !this.mainPopover.popover) return;

    this.mainPopover.popover.querySelectorAll('.five-thirty-cs-group-btn').forEach(btn => {
      const isActive = btn.dataset.groupId === this.activeGroupId;
      btn.classList.toggle('five-thirty-cs-group-btn--active', isActive);
    });
  }

  // ===== Helpers =====

  _groupHasSelection(group) {
    return group.channels.some(ch => this.selectedChannels.has(ch.slug));
  }

  _groupHasPrimary(group) {
    return group.channels.some(ch => ch.slug === this.primaryChannel);
  }

  _escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _escapeAttr(text) {
    if (!text) return '';
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}

// Export for use in content scripts
window.ChannelSelector = ChannelSelector;
console.log('530: ChannelSelector loaded and registered on window');
