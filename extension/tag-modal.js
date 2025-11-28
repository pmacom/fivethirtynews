// 530 Tag Selection Modal

// Hierarchical category system
const TAG_CATEGORIES = {
  content: {
    title: 'Content Type',
    icon: '📝',
    tags: ['Article', 'Thread', 'Meme', 'News', 'Tutorial', 'Opinion', 'Question']
  },
  topic: {
    title: 'Topic',
    icon: '🏷️',
    tags: ['Tech', 'AI/ML', 'Design', 'Business', 'Politics', 'Science', 'Sports', 'Entertainment']
  },
  quality: {
    title: 'Quality',
    icon: '⭐',
    tags: ['Must Read', 'Important', 'Interesting', 'Controversial', 'Funny', 'Inspirational']
  },
  action: {
    title: 'Action',
    icon: '🎯',
    tags: ['Read Later', 'Research', 'Share', 'Follow Up', 'Bookmark', 'Archive']
  }
};

class TagModal {
  constructor(postData, onSave, onCancel) {
    this.postData = postData;
    this.onSave = onSave;
    this.onCancel = onCancel;
    this.selectedTags = [];
    this.customTag = '';

    this.render();
    this.attachListeners();
  }

  render() {
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'five-thirty-modal-overlay';

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'five-thirty-modal';

    modal.innerHTML = `
      <div class="five-thirty-modal-header">
        <h2>Tag This Post</h2>
        <p>Select categories or add custom tags</p>
      </div>

      <div class="five-thirty-modal-body">
        ${this.renderCategories()}

        <div class="five-thirty-custom-tag">
          <label for="customTag">Custom Tag</label>
          <input
            type="text"
            id="customTag"
            placeholder="Enter custom tag..."
            maxlength="50"
          />
        </div>
      </div>

      <div class="five-thirty-modal-footer">
        <button class="five-thirty-modal-button cancel">Cancel</button>
        <button class="five-thirty-modal-button save">Save Tag</button>
      </div>
    `;

    this.overlay.appendChild(modal);
    document.body.appendChild(this.overlay);
  }

  renderCategories() {
    return Object.entries(TAG_CATEGORIES).map(([key, category]) => `
      <div class="five-thirty-category-section">
        <div class="five-thirty-category-title">
          <span class="five-thirty-category-icon">${category.icon}</span>
          <span>${category.title}</span>
        </div>
        <div class="five-thirty-tags-grid">
          ${category.tags.map(tag => `
            <div class="five-thirty-tag-option" data-category="${key}" data-tag="${tag}">
              ${tag}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  attachListeners() {
    // Tag selection
    const tagOptions = this.overlay.querySelectorAll('.five-thirty-tag-option');
    tagOptions.forEach(option => {
      option.addEventListener('click', () => {
        const tag = option.dataset.tag;
        const category = option.dataset.category;

        if (option.classList.contains('selected')) {
          // Deselect
          option.classList.remove('selected');
          this.selectedTags = this.selectedTags.filter(t => t.tag !== tag);
        } else {
          // Select
          option.classList.add('selected');
          this.selectedTags.push({ category, tag });
        }
      });
    });

    // Custom tag input
    const customInput = this.overlay.querySelector('#customTag');
    customInput.addEventListener('input', (e) => {
      this.customTag = e.target.value.trim();
    });

    // Cancel button
    const cancelBtn = this.overlay.querySelector('.five-thirty-modal-button.cancel');
    cancelBtn.addEventListener('click', () => {
      this.close();
      if (this.onCancel) this.onCancel();
    });

    // Save button
    const saveBtn = this.overlay.querySelector('.five-thirty-modal-button.save');
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
  }

  save() {
    // Combine selected tags and custom tag
    const allTags = [...this.selectedTags];

    if (this.customTag) {
      allTags.push({
        category: 'custom',
        tag: this.customTag
      });
    }

    // Must have at least one tag
    if (allTags.length === 0) {
      alert('Please select at least one tag or enter a custom tag');
      return;
    }

    // Prepare tag data
    const tagData = {
      ...this.postData,
      tags: allTags,
      categories: this.getCategorySummary(allTags)
    };

    this.close();
    if (this.onSave) this.onSave(tagData);
  }

  getCategorySummary(tags) {
    const summary = {};
    tags.forEach(({ category, tag }) => {
      if (!summary[category]) {
        summary[category] = [];
      }
      summary[category].push(tag);
    });
    return summary;
  }

  close() {
    document.removeEventListener('keydown', this.escapeHandler);
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
}

// Export for use in content script
window.TagModal = TagModal;
