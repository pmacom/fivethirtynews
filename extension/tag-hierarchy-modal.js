// 530 Hierarchical Tag Selection Modal

class TagHierarchyModal {
  constructor(postData, existingTags = [], onSave, onCancel) {
    this.postData = postData;
    this.existingTags = existingTags || [];
    this.onSave = onSave;
    this.onCancel = onCancel;
    this.selectedTagSlugs = new Set(this.existingTags);
    this.tagHierarchy = [];
    this.expandedCategories = new Set();
    this.loading = true;
    this.tagifyInstance = null;
    this.tagifyIntegration = new window.TagifyIntegration();

    this.render();
    this.loadTagHierarchy();
  }

  async loadTagHierarchy() {
    try {
      console.log('530 Modal: Requesting tag hierarchy...');
      const response = await chrome.runtime.sendMessage({
        action: 'getTagHierarchy'
      });

      console.log('530 Modal: Received response:', response);

      if (response.success) {
        this.tagHierarchy = response.data;
        console.log('530 Modal: Tag hierarchy loaded:', this.tagHierarchy.length, 'root categories');
        console.log('530 Modal: Root category names:', this.tagHierarchy.map(t => t.name));

        // Build parent chain map for search
        this.buildParentMap(this.tagHierarchy);

        // Start with all categories collapsed (users can expand as needed)
        // this.expandAllCategories(this.tagHierarchy);
        console.log('530 Modal: Categories collapsed by default');

        this.loading = false;
        this.updateBody();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('530: Failed to load tag hierarchy', error);
      this.loading = false;
      this.updateBody();
    }
  }

  // Build a map of tag IDs to their parent tag names for search
  buildParentMap(tags, parentNames = []) {
    if (!this.tagParentMap) {
      this.tagParentMap = new Map();
    }

    tags.forEach(tag => {
      // Store parent names for this tag
      this.tagParentMap.set(tag.id, [...parentNames]);

      // Recursively process children with this tag's name added to parent chain
      if (tag.children && tag.children.length > 0) {
        this.buildParentMap(tag.children, [...parentNames, tag.name]);
      }
    });
  }

  // Recursively expand all categories
  expandAllCategories(tags) {
    tags.forEach(tag => {
      if (tag.id && tag.children && tag.children.length > 0) {
        this.expandedCategories.add(tag.id);
        // Recursively expand children
        this.expandAllCategories(tag.children);
      }
    });
  }

  // Render content preview section
  renderContentPreview() {
    // Get content data
    const content = this.postData.content || this.postData.tweetText || this.postData.description || '';
    const title = this.postData.title || '';
    const thumbnailUrl = this.postData.thumbnailUrl || '';
    const mediaAssets = this.postData.mediaAssets || [];
    const platform = this.postData.platform || 'twitter';
    const url = this.postData.url || '';
    const authorAvatarUrl = this.postData.authorAvatarUrl || '';
    const author = this.postData.author || this.postData.authorUsername || 'Unknown';
    const authorUsername = this.postData.authorUsername || '';

    // Don't show preview if there's no content
    if (!content && !title && !thumbnailUrl && mediaAssets.length === 0) {
      return '';
    }

    // Truncate content to 1000 characters
    const shouldTruncate = content.length > 1000;
    const truncatedContent = shouldTruncate ? content.substring(0, 1000) + '...' : content;

    return `
      <div class="five-thirty-content-preview">
        <div class="five-thirty-preview-layout">
          <!-- Author Section (Left) -->
          <div class="five-thirty-preview-author">
            ${authorAvatarUrl ? `
              <img src="${authorAvatarUrl}" alt="${this.escapeHtml(author)}" class="five-thirty-author-avatar" />
            ` : `
              <div class="five-thirty-author-avatar-placeholder">
                ${author.charAt(0).toUpperCase()}
              </div>
            `}
            <div class="five-thirty-author-info">
              <div class="five-thirty-author-name">${this.escapeHtml(author)}</div>
              ${authorUsername ? `<div class="five-thirty-author-username">@${this.escapeHtml(authorUsername)}</div>` : ''}
              <span class="five-thirty-platform-badge">${platform}</span>
            </div>
          </div>

          <!-- Content Section (Right) -->
          <div class="five-thirty-preview-content">
            ${title ? `<div class="five-thirty-preview-title">${this.escapeHtml(title)}</div>` : ''}

            ${content ? `
              <div class="five-thirty-preview-text ${shouldTruncate ? 'truncated' : ''}" id="previewText">${this.escapeHtml(truncatedContent)}</div>
              ${shouldTruncate ? `
                <button class="five-thirty-expand-text" id="expandTextBtn">
                  <span class="expand-label">Show more</span>
                  <span class="collapse-label" style="display: none;">Show less</span>
                </button>
              ` : ''}
            ` : ''}

            ${thumbnailUrl || mediaAssets.length > 0 ? `
              <div class="five-thirty-preview-media">
                ${thumbnailUrl ? `
                  <img src="${thumbnailUrl}" alt="Content thumbnail" class="five-thirty-preview-thumbnail" />
                ` : ''}
                ${mediaAssets.length > 1 ? `
                  <div class="five-thirty-media-count">+${mediaAssets.length - 1} more</div>
                ` : ''}
              </div>
            ` : ''}

            ${url ? `
              <a href="${url}" target="_blank" class="five-thirty-preview-link">View original ↗</a>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  // Helper to escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  render() {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'five-thirty-modal-overlay';

    // Create modal
    this.modal = document.createElement('div');
    this.modal.className = 'five-thirty-modal five-thirty-hierarchy-modal';

    this.modal.innerHTML = `
      <div class="five-thirty-modal-header">
        <div class="five-thirty-header-title">
          <h2>📌 Add Content</h2>
          ${this.existingTags.length > 0
            ? `<div class="five-thirty-existing-badge">Already tagged with ${this.existingTags.length} tag(s)</div>`
            : '<div class="five-thirty-new-badge">New post</div>'}
        </div>

        ${this.renderContentPreview()}
      </div>

      <div class="five-thirty-modal-body" id="tagModalBody">
        <div class="five-thirty-loading">Loading tags...</div>
      </div>

      <div class="five-thirty-modal-footer">
        <div class="five-thirty-selected-count">
          <span id="selectedCount">${this.selectedTagSlugs.size}</span> tag(s) selected
        </div>
        <div class="five-thirty-modal-actions">
          <button class="five-thirty-modal-button cancel">Cancel</button>
          <button class="five-thirty-modal-button save" id="saveButton">
            ${this.existingTags.length > 0 ? 'Update Tags' : 'Save Tags'}
          </button>
        </div>
      </div>
    `;

    this.overlay.appendChild(this.modal);
    document.body.appendChild(this.overlay);
    this.attachListeners();
  }

  updateBody() {
    const body = document.getElementById('tagModalBody');

    if (this.loading) {
      body.innerHTML = '<div class="five-thirty-loading">Loading tags...</div>';
      return;
    }

    if (this.tagHierarchy.length === 0) {
      body.innerHTML = '<div class="five-thirty-error">No tags available. Please check your connection.</div>';
      return;
    }

    body.innerHTML = `
      <div class="five-thirty-tagify-section">
        <label class="five-thirty-tagify-label">
          <span class="five-thirty-tagify-label-text">Quick Add Tags (comma-separated)</span>
          <span class="five-thirty-tagify-hint">Type to search or get smart suggestions based on selected tags</span>
        </label>
        <input
          type="text"
          id="tagifyInput"
          class="five-thirty-tagify-input"
          placeholder="Start typing tag names..."
        />
      </div>

      <div class="five-thirty-section-divider">
        <span>OR BROWSE ALL TAGS</span>
      </div>

      <div class="five-thirty-search-box">
        <input
          type="text"
          id="tagSearch"
          placeholder="Search tags..."
          class="five-thirty-search-input"
        />
      </div>
      <div class="five-thirty-hierarchy-container">
        ${this.renderHierarchy(this.tagHierarchy)}
      </div>
    `;

    this.attachHierarchyListeners();
    this.initializeTagify();
  }

  renderHierarchy(tags, level = 0) {
    return tags.map(tag => {
      const isExpanded = this.expandedCategories.has(tag.id);
      const hasChildren = tag.children && tag.children.length > 0;
      const isSelected = this.selectedTagSlugs.has(tag.slug);
      const childrenSelected = hasChildren ? this.countSelectedChildren(tag) : 0;

      return `
        <div class="five-thirty-tag-row" data-level="${level}">
          <div class="five-thirty-tag-item ${isSelected ? 'selected' : ''}" data-tag-id="${tag.id}" data-slug="${tag.slug}">
            ${hasChildren ? `
              <button class="five-thirty-expand-btn ${isExpanded ? 'expanded' : ''}" data-tag-id="${tag.id}">
                ${isExpanded ? '▼' : '▶'}
              </button>
            ` : '<span class="five-thirty-no-expand"></span>'}

            <div class="five-thirty-tag-content">
              <div class="five-thirty-tag-info">
                <span class="five-thirty-tag-name">${tag.name}</span>
                ${childrenSelected > 0 && !isSelected ? `<span class="five-thirty-tag-badge">${childrenSelected}</span>` : ''}
                ${tag.description ? `<span class="five-thirty-tag-desc">${tag.description}</span>` : ''}
              </div>
            </div>

            <div class="five-thirty-tag-checkbox">
              <input
                type="checkbox"
                class="five-thirty-checkbox"
                data-slug="${tag.slug}"
                data-tag-id="${tag.id}"
                ${isSelected ? 'checked' : ''}
              />
            </div>
          </div>

          ${hasChildren && isExpanded ? `
            <div class="five-thirty-children">
              ${this.renderHierarchy(tag.children, level + 1)}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  countSelectedChildren(tag) {
    let count = 0;
    if (tag.children) {
      tag.children.forEach(child => {
        if (this.selectedTagSlugs.has(child.slug)) count++;
        count += this.countSelectedChildren(child);
      });
    }
    return count;
  }

  attachListeners() {
    // Cancel button
    const cancelBtn = this.modal.querySelector('.five-thirty-modal-button.cancel');
    cancelBtn.addEventListener('click', () => {
      this.close();
      if (this.onCancel) this.onCancel();
    });

    // Save button
    const saveBtn = this.modal.querySelector('.five-thirty-modal-button.save');
    saveBtn.addEventListener('click', () => {
      this.save();
    });

    // Close on overlay click
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
        if (this.onCancel) this.onCancel();
      }
    });

    // Close on ESC key
    this.escapeHandler = (e) => {
      if (e.key === 'Escape') {
        this.close();
        if (this.onCancel) this.onCancel();
      }
    };
    document.addEventListener('keydown', this.escapeHandler);

    // Expand/collapse content text
    const expandTextBtn = this.modal.querySelector('#expandTextBtn');
    if (expandTextBtn) {
      expandTextBtn.addEventListener('click', () => {
        const previewText = this.modal.querySelector('#previewText');
        const expandLabel = expandTextBtn.querySelector('.expand-label');
        const collapseLabel = expandTextBtn.querySelector('.collapse-label');
        const fullContent = this.postData.content || this.postData.tweetText || this.postData.description || '';

        if (previewText.classList.contains('truncated')) {
          // Expand
          previewText.innerHTML = this.escapeHtml(fullContent);
          previewText.classList.remove('truncated');
          expandLabel.style.display = 'none';
          collapseLabel.style.display = 'inline';
        } else {
          // Collapse
          const truncatedContent = fullContent.substring(0, 1000) + '...';
          previewText.innerHTML = this.escapeHtml(truncatedContent);
          previewText.classList.add('truncated');
          expandLabel.style.display = 'inline';
          collapseLabel.style.display = 'none';
        }
      });
    }
  }

  attachHierarchyListeners() {
    // Expand/collapse buttons
    const expandBtns = this.modal.querySelectorAll('.five-thirty-expand-btn');
    expandBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const tagId = btn.dataset.tagId;

        if (this.expandedCategories.has(tagId)) {
          this.expandedCategories.delete(tagId);
        } else {
          this.expandedCategories.add(tagId);
        }

        this.updateBody();
      });
    });

    // Tag selection via checkbox
    const checkboxes = this.modal.querySelectorAll('.five-thirty-checkbox');
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        const slug = checkbox.dataset.slug;
        const tagItem = checkbox.closest('.five-thirty-tag-item');
        const tagName = tagItem?.querySelector('.five-thirty-tag-name')?.textContent || slug;

        if (checkbox.checked) {
          this.selectedTagSlugs.add(slug);
          // Sync with Tagify
          this.syncTagifyFromCheckbox(slug, tagName, true);
        } else {
          this.selectedTagSlugs.delete(slug);
          // Sync with Tagify
          this.syncTagifyFromCheckbox(slug, tagName, false);
        }

        this.updateSelectedCount();
        this.updateTagItemAppearance(checkbox.dataset.tagId);
      });
    });

    // Tag selection via clicking the row
    const tagItems = this.modal.querySelectorAll('.five-thirty-tag-item');
    tagItems.forEach(item => {
      item.addEventListener('click', (e) => {
        // Don't toggle if clicking expand button or checkbox
        if (e.target.closest('.five-thirty-expand-btn') || e.target.closest('.five-thirty-checkbox')) {
          return;
        }

        const slug = item.dataset.slug;
        const checkbox = item.querySelector('.five-thirty-checkbox');
        const tagName = item.querySelector('.five-thirty-tag-name')?.textContent || slug;

        if (this.selectedTagSlugs.has(slug)) {
          this.selectedTagSlugs.delete(slug);
          if (checkbox) checkbox.checked = false;
          item.classList.remove('selected');
          // Sync with Tagify
          this.syncTagifyFromCheckbox(slug, tagName, false);
        } else {
          this.selectedTagSlugs.add(slug);
          if (checkbox) checkbox.checked = true;
          item.classList.add('selected');
          // Sync with Tagify
          this.syncTagifyFromCheckbox(slug, tagName, true);
        }

        this.updateSelectedCount();
      });
    });

    // Search functionality
    const searchInput = this.modal.querySelector('#tagSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterTags(e.target.value.toLowerCase());
      });
    }
  }

  updateTagItemAppearance(tagId) {
    const item = this.modal.querySelector(`.five-thirty-tag-item[data-tag-id="${tagId}"]`);
    if (item) {
      const slug = item.dataset.slug;
      if (this.selectedTagSlugs.has(slug)) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    }
  }

  updateSelectedCount() {
    const countEl = document.getElementById('selectedCount');
    if (countEl) {
      countEl.textContent = this.selectedTagSlugs.size;
    }
  }

  filterTags(searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') {
      // Show all tags when search is empty
      const allRows = this.modal.querySelectorAll('.five-thirty-tag-row');
      allRows.forEach(row => row.style.display = '');
      return;
    }

    // Normalize search term: trim, lowercase
    const normalizedSearch = searchTerm.trim().toLowerCase();
    console.log('530 Modal: Filtering tags with search term:', normalizedSearch);

    const allRows = this.modal.querySelectorAll('.five-thirty-tag-row');
    let matchCount = 0;
    const rowsToShow = new Set(); // Track which rows should be visible

    // First pass: find all matching tags
    allRows.forEach(row => {
      const tagItem = row.querySelector('.five-thirty-tag-item');
      if (!tagItem) {
        console.warn('530 Modal: No tag item found in row');
        return;
      }

      const tagId = tagItem.dataset.tagId;
      const tagNameElement = tagItem.querySelector('.five-thirty-tag-name');
      const tagDescElement = tagItem.querySelector('.five-thirty-tag-desc');

      if (!tagNameElement) {
        console.warn('530 Modal: No tag name element found for tag:', tagId);
        return;
      }

      const tagName = tagNameElement.textContent.toLowerCase().trim();
      const tagDesc = tagDescElement?.textContent.toLowerCase().trim() || '';

      // Get parent tag names from the map
      const parentNames = this.tagParentMap?.get(tagId) || [];
      const parentText = parentNames.join(' ').toLowerCase();

      // Search matches if the search term is found in:
      // - Tag name (partial match)
      // - Any parent tag name (partial match)
      // - Tag description (partial match)
      const matchesName = tagName.includes(normalizedSearch);
      const matchesParent = parentText.includes(normalizedSearch);
      const matchesDescription = tagDesc.includes(normalizedSearch);

      const matches = matchesName || matchesParent || matchesDescription;

      if (matches) {
        matchCount++;
        console.log('530 Modal: MATCH -', tagName, '(parent:', parentText || 'none', ', desc:', tagDesc.substring(0, 30) + '...)');

        // Mark this row and all its parent rows to be shown
        rowsToShow.add(row);

        // Walk up the DOM to find and show all parent tag rows
        let parentElement = row.parentElement;
        while (parentElement) {
          // Check if this parent is a tag-row (it might be a children container or other wrapper)
          if (parentElement.classList && parentElement.classList.contains('five-thirty-tag-row')) {
            rowsToShow.add(parentElement);
          }
          parentElement = parentElement.parentElement;

          // Stop when we reach the hierarchy container
          if (parentElement && parentElement.classList && parentElement.classList.contains('five-thirty-hierarchy-container')) {
            break;
          }
        }
      }
    });

    // Second pass: show/hide rows based on matches and parent relationships
    allRows.forEach(row => {
      if (rowsToShow.has(row)) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });

    console.log('530 Modal: Found', matchCount, 'matching tags out of', allRows.length, 'total tags');
  }

  async save() {
    if (this.selectedTagSlugs.size === 0) {
      alert('Please select at least one tag');
      return;
    }

    const saveBtn = document.getElementById('saveButton');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      // Detect if this is legacy Twitter format or new multi-platform format
      const isLegacyTwitter = this.postData.tweetId && !this.postData.platform;

      let response;

      if (isLegacyTwitter) {
        // Use legacy Twitter API
        const tagData = {
          tweetId: this.postData.tweetId,
          tweetText: this.postData.tweetText,
          author: this.postData.author,
          url: this.postData.url,
          thumbnailUrl: this.postData.thumbnailUrl,
          tags: Array.from(this.selectedTagSlugs)
        };

        response = await chrome.runtime.sendMessage({
          action: 'updatePostTags',
          data: tagData
        });
      } else {
        // Use new multi-platform API
        const contentData = {
          platform: this.postData.platform,
          platformContentId: this.postData.platformContentId,
          url: this.postData.url,
          tags: Array.from(this.selectedTagSlugs),
          title: this.postData.title,
          description: this.postData.description,
          content: this.postData.content,
          author: this.postData.author,
          authorUsername: this.postData.authorUsername,
          authorUrl: this.postData.authorUrl,
          authorAvatarUrl: this.postData.authorAvatarUrl,
          thumbnailUrl: this.postData.thumbnailUrl,
          mediaAssets: this.postData.mediaAssets,
          metadata: this.postData.metadata,
          contentCreatedAt: this.postData.contentCreatedAt
        };

        response = await chrome.runtime.sendMessage({
          action: 'updateContentTags',
          data: contentData
        });
      }

      if (response.success) {
        this.close();
        if (this.onSave) this.onSave(response.data);
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      console.error('530: Failed to save tags', error);
      alert('Failed to save tags. Please try again.');
      saveBtn.disabled = false;
      saveBtn.textContent = this.existingTags.length > 0 ? 'Update Tags' : 'Save Tags';
    }
  }

  initializeTagify() {
    const input = document.getElementById('tagifyInput');
    if (!input || !window.Tagify) {
      console.warn('530: Tagify input or library not found');
      return;
    }

    // Destroy previous instance if exists
    if (this.tagifyInstance) {
      this.tagifyInstance.destroy();
    }

    // Initialize Tagify with configuration
    this.tagifyInstance = new window.Tagify(input, {
      whitelist: [],
      enforceWhitelist: false, // Allow custom tags initially
      dropdown: {
        enabled: 0, // Show dropdown immediately on focus
        maxItems: 15,
        closeOnSelect: false,
        highlightFirst: true,
      },
      templates: {
        dropdownItem: this.tagifyIntegration.getSuggestionTemplate(),
        tag: this.tagifyIntegration.getTagTemplate(),
      },
      duplicates: false,
    });

    // Load existing tags into Tagify
    if (this.selectedTagSlugs.size > 0) {
      this.syncTagifyFromCheckboxes();
    }

    // Listen to input changes for dynamic suggestions
    this.tagifyInstance.on('input', (e) => {
      const value = e.detail.value;
      const selectedSlugs = Array.from(this.selectedTagSlugs);

      // Show loading state
      this.tagifyInstance.loading(true).dropdown.hide();

      // Debounced fetch
      this.tagifyIntegration.debouncedFetch(value, selectedSlugs, (suggestions) => {
        this.tagifyInstance.whitelist = suggestions;
        this.tagifyInstance.loading(false).dropdown.show(value);
      });
    });

    // When a tag is added via Tagify
    this.tagifyInstance.on('add', (e) => {
      const tagSlug = e.detail.data.value;
      console.log('530 Tagify: Tag added', tagSlug);

      // Add to selected set
      this.selectedTagSlugs.add(tagSlug);

      // Update checkbox if exists
      this.syncCheckboxFromTagify(tagSlug, true);

      // Update count
      this.updateSelectedCount();
    });

    // When a tag is removed via Tagify
    this.tagifyInstance.on('remove', (e) => {
      const tagSlug = e.detail.data.value;
      console.log('530 Tagify: Tag removed', tagSlug);

      // Remove from selected set
      this.selectedTagSlugs.delete(tagSlug);

      // Update checkbox if exists
      this.syncCheckboxFromTagify(tagSlug, false);

      // Update count
      this.updateSelectedCount();
    });

    console.log('530: Tagify initialized');
  }

  /**
   * Sync Tagify input with currently selected checkboxes
   */
  syncTagifyFromCheckboxes() {
    if (!this.tagifyInstance) return;

    // Get tag names for selected slugs
    const selectedTags = [];

    this.tagHierarchy.forEach(rootTag => {
      this.collectSelectedTags(rootTag, selectedTags);
    });

    // Update Tagify value
    this.tagifyInstance.removeAllTags();
    this.tagifyInstance.addTags(selectedTags);
  }

  /**
   * Recursively collect selected tags with their names
   */
  collectSelectedTags(tag, result) {
    if (this.selectedTagSlugs.has(tag.slug)) {
      result.push({
        value: tag.slug,
        name: tag.name,
      });
    }

    if (tag.children && tag.children.length > 0) {
      tag.children.forEach(child => this.collectSelectedTags(child, result));
    }
  }

  /**
   * Update checkbox state when Tagify changes
   */
  syncCheckboxFromTagify(tagSlug, isSelected) {
    const checkbox = this.modal.querySelector(`.five-thirty-checkbox[data-slug="${tagSlug}"]`);
    const tagItem = this.modal.querySelector(`.five-thirty-tag-item[data-slug="${tagSlug}"]`);

    if (checkbox) {
      checkbox.checked = isSelected;
    }

    if (tagItem) {
      if (isSelected) {
        tagItem.classList.add('selected');
      } else {
        tagItem.classList.remove('selected');
      }
    }
  }

  /**
   * Update Tagify when checkbox is clicked
   */
  syncTagifyFromCheckbox(tagSlug, tagName, isSelected) {
    if (!this.tagifyInstance) return;

    if (isSelected) {
      // Add tag to Tagify
      this.tagifyInstance.addTags([{ value: tagSlug, name: tagName }]);
    } else {
      // Remove tag from Tagify
      const tagElement = this.tagifyInstance.getTagElmByValue(tagSlug);
      if (tagElement) {
        this.tagifyInstance.removeTag(tagElement);
      }
    }
  }

  close() {
    document.removeEventListener('keydown', this.escapeHandler);

    // Destroy Tagify instance
    if (this.tagifyInstance) {
      this.tagifyInstance.destroy();
      this.tagifyInstance = null;
    }

    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
}

// Export for use in content script
window.TagHierarchyModal = TagHierarchyModal;
