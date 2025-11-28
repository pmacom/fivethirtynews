// 530 Tagify Integration
// Wrapper for connecting Tagify to our tag suggestion API

class TagifyIntegration {
  constructor() {
    this.apiBaseUrl = 'http://localhost:3000/api';
    this.debounceTimer = null;
    this.debounceDelay = 300; // ms
    this.controller = null; // For aborting fetch requests
  }

  /**
   * Fetch tag suggestions from our API
   * @param {string} input - Text input from user
   * @param {string[]} selectedTagSlugs - Currently selected tag slugs
   * @param {string} mode - 'fuzzy', 'relationships', or 'hybrid'
   * @returns {Promise<Array>} Array of tag suggestions
   */
  async fetchSuggestions(input = '', selectedTagSlugs = [], mode = 'hybrid') {
    // Abort previous request if still pending
    if (this.controller) {
      this.controller.abort();
    }

    this.controller = new AbortController();

    try {
      // Build query parameters
      const params = new URLSearchParams();

      if (input && input.trim()) {
        params.append('input', input.trim());
      }

      if (selectedTagSlugs.length > 0) {
        params.append('tagSlugs', selectedTagSlugs.join(','));
      }

      if (mode) {
        params.append('mode', mode);
      }

      params.append('limit', '15'); // Limit suggestions

      const url = `${this.apiBaseUrl}/tags/suggest?${params.toString()}`;
      console.log('530 Tagify: Fetching suggestions from', url);

      const response = await fetch(url, {
        signal: this.controller.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        console.log('530 Tagify: Received', result.data.length, 'suggestions');
        return this.formatSuggestionsForTagify(result.data);
      }

      return [];
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('530 Tagify: Request aborted');
      } else {
        console.error('530 Tagify: Error fetching suggestions', error);
      }
      return [];
    }
  }

  /**
   * Format API response for Tagify's expected format
   * @param {Array} suggestions - Raw API suggestions
   * @returns {Array} Formatted for Tagify
   */
  formatSuggestionsForTagify(suggestions) {
    return suggestions.map(tag => ({
      value: tag.tagSlug,
      name: tag.tagName,
      score: tag.score,
      source: tag.source, // 'fuzzy', 'relationship', 'co-occurrence', 'both'
    }));
  }

  /**
   * Debounced suggestion fetcher
   * @param {string} input
   * @param {string[]} selectedTagSlugs
   * @param {Function} callback
   */
  debouncedFetch(input, selectedTagSlugs, callback) {
    clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(async () => {
      // Determine mode based on context
      let mode = 'hybrid';

      if (!input || input.trim() === '') {
        // No input, only selected tags -> show relationships
        mode = 'relationships';
      } else if (selectedTagSlugs.length === 0) {
        // Input but no tags selected -> fuzzy search only
        mode = 'fuzzy';
      }
      // else: both input and selected tags -> hybrid mode

      const suggestions = await this.fetchSuggestions(input, selectedTagSlugs, mode);
      callback(suggestions);
    }, this.debounceDelay);
  }

  /**
   * Get related tags for a specific tag (for "show related" button)
   * @param {string} tagSlug
   * @returns {Promise<Array>}
   */
  async getRelatedTags(tagSlug) {
    try {
      const url = `${this.apiBaseUrl}/tags/related?tagSlug=${tagSlug}&limit=10`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        return result.data.map(tag => ({
          value: tag.tagSlug,
          name: tag.tagName,
          relationshipType: tag.relationshipType,
          strength: tag.strength,
          direction: tag.direction,
        }));
      }

      return [];
    } catch (error) {
      console.error('530 Tagify: Error fetching related tags', error);
      return [];
    }
  }

  /**
   * Create custom Tagify template for suggestion dropdown
   * Shows tag name, source indicator, and score
   */
  getSuggestionTemplate() {
    return function (tagData) {
      const sourceColors = {
        fuzzy: '#667eea',
        relationship: '#10b981',
        'co-occurrence': '#f59e0b',
        both: '#8b5cf6',
      };

      const sourceLabels = {
        fuzzy: 'Match',
        relationship: 'Related',
        'co-occurrence': 'Often Used',
        both: 'Smart',
      };

      const sourceColor = sourceColors[tagData.source] || '#94a3b8';
      const sourceLabel = sourceLabels[tagData.source] || tagData.source;
      const scorePercent = tagData.score ? Math.round(tagData.score * 100) : '';

      return `
        <div class='tagify__dropdown__item' data-value='${tagData.value}'>
          <div style='display: flex; align-items: center; justify-content: space-between; width: 100%;'>
            <div>
              <strong>${tagData.name || tagData.value}</strong>
            </div>
            <div style='display: flex; gap: 6px; align-items: center;'>
              ${scorePercent ? `<span style='font-size: 11px; color: #94a3b8;'>${scorePercent}%</span>` : ''}
              <span style='
                font-size: 10px;
                padding: 2px 6px;
                background: ${sourceColor};
                color: white;
                border-radius: 4px;
                font-weight: 600;
              '>${sourceLabel}</span>
            </div>
          </div>
        </div>
      `;
    };
  }

  /**
   * Create custom template for selected tag chips
   * Color-coded by category
   */
  getTagTemplate() {
    return function (tagData) {
      return `
        <tag title='${tagData.name || tagData.value}'
             contenteditable='false'
             spellcheck='false'
             class='tagify__tag'>
          <x title='remove tag' class='tagify__tag__removeBtn'></x>
          <div>
            <span class='tagify__tag-text'>${tagData.name || tagData.value}</span>
          </div>
        </tag>
      `;
    };
  }
}

// Make available globally
window.TagifyIntegration = TagifyIntegration;
console.log('530 Tagify Integration loaded');
