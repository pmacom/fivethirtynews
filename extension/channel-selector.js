// 530 ChannelSelector - Channel selection UI with auto-save
console.log('530: Loading ChannelSelector...');

/**
 * ChannelSelector - Main UI for selecting channels when tagging content
 * Uses SmartPopover for positioning and sub-menus
 */
class ChannelSelector {
  constructor(options = {}) {
    this.postData = options.postData || {};
    this.existingChannels = options.existingChannels || [];
    this.existingPrimaryChannel = options.existingPrimaryChannel || null;
    this.onSave = options.onSave || null;
    this.onCancel = options.onCancel || null;

    // State
    this.selectedChannels = new Set(this.existingChannels);
    this.primaryChannel = this.existingPrimaryChannel || (this.existingChannels[0] || null);
    this.channelGroups = [];
    this.channelsMap = new Map(); // slug -> channel object
    this.loading = true;
    this.saving = false;
    this.activeGroupId = null;

    // Popovers
    this.mainPopover = null;
    this.subPopover = null;

    // Load channel data
    this._loadChannelGroups();
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
    if (this.selectedChannels.size === 0) return;

    this.saving = true;

    try {
      const contentData = {
        platform: this.postData.platform || 'twitter',
        platformContentId: this.postData.platformContentId || this.postData.tweetId,
        url: this.postData.url,
        channels: Array.from(this.selectedChannels),
        primaryChannel: this.primaryChannel,
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
            primaryChannel: this.primaryChannel
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
        ${this._renderGroupBar()}
        ${this._renderSelectedArea()}
        ${this._renderDoneButton()}
      </div>
    `;
  }

  _renderDoneButton() {
    return `
      <div class="five-thirty-cs-done">
        <button class="five-thirty-cs-done-btn" ${this.selectedChannels.size === 0 ? 'disabled' : ''}>
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
          <div class="five-thirty-cs-empty">Click a category below to add channels</div>
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

    // Group buttons
    container.querySelectorAll('.five-thirty-cs-group-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const groupId = btn.dataset.groupId;
        this._toggleGroupPopover(groupId, btn);
      });
    });

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
