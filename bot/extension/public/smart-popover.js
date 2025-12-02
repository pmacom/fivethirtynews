// 530 SmartPopover - Vanilla JS Popover with CSS Anchor Positioning + Fallback
console.log('530: Loading SmartPopover...');

/**
 * SmartPopover - A reusable popover component with smart positioning
 * Uses CSS Anchor Positioning where supported, with JS fallback for older browsers
 */
class SmartPopover {
  // Static tracking of all open popovers for escape key handling
  static openStack = [];

  // Feature detection for CSS Anchor Positioning
  static supportsAnchorPositioning = typeof CSS !== 'undefined' &&
    CSS.supports && CSS.supports('anchor-name', '--test');

  constructor(options = {}) {
    this.content = options.content || '';
    this.placement = options.placement || 'bottom';
    this.alignment = options.alignment || 'start';
    this.offset = options.offset || 8;
    this.className = options.className || '';
    this.onOpen = options.onOpen || null;
    this.onClose = options.onClose || null;
    this.closeOnClickOutside = options.closeOnClickOutside !== false;
    this.closeOnEscape = options.closeOnEscape !== false;
    this.parentPopover = options.parentPopover || null;

    this.popover = null;
    this.anchor = null;
    this.isOpen = false;
    this.childPopovers = [];
    this.anchorId = `ft-anchor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Bound event handlers for cleanup
    this._boundClickOutside = this._handleClickOutside.bind(this);
    this._boundEscape = this._handleEscape.bind(this);
    this._boundScroll = this._handleScroll.bind(this);
    this._boundResize = this._handleResize.bind(this);
  }

  /**
   * Open the popover anchored to an element
   */
  open(anchorElement) {
    if (this.isOpen) return;

    this.anchor = anchorElement;
    this._createPopover();
    this._setupEventListeners();

    // Register with parent if nested
    if (this.parentPopover) {
      this.parentPopover.registerChildPopover(this);
    }

    // Add to global stack for escape handling
    SmartPopover.openStack.push(this);

    this.isOpen = true;

    // Position after next frame to ensure dimensions are calculated
    requestAnimationFrame(() => {
      this._updatePosition();
      this.popover.classList.add('five-thirty-popover--open');
      if (this.onOpen) this.onOpen();
    });
  }

  /**
   * Close the popover
   */
  close() {
    if (!this.isOpen) return;

    // Close all child popovers first
    this.childPopovers.forEach(child => child.close());
    this.childPopovers = [];

    // Remove from global stack
    const stackIndex = SmartPopover.openStack.indexOf(this);
    if (stackIndex > -1) {
      SmartPopover.openStack.splice(stackIndex, 1);
    }

    // Unregister from parent
    if (this.parentPopover) {
      this.parentPopover.unregisterChildPopover(this);
    }

    this._removeEventListeners();

    if (this.popover && this.popover.parentNode) {
      this.popover.parentNode.removeChild(this.popover);
    }

    this.popover = null;
    this.anchor = null;
    this.isOpen = false;

    if (this.onClose) this.onClose();
  }

  /**
   * Update popover content
   */
  setContent(html) {
    this.content = html;
    if (this.popover) {
      this.popover.innerHTML = html;
    }
  }

  /**
   * Force position update
   */
  updatePosition() {
    if (this.isOpen) {
      this._updatePosition();
    }
  }

  /**
   * Clean up and destroy
   */
  destroy() {
    this.close();
  }

  /**
   * Register a child popover (for nested popovers)
   */
  registerChildPopover(child) {
    if (!this.childPopovers.includes(child)) {
      this.childPopovers.push(child);
    }
  }

  /**
   * Unregister a child popover
   */
  unregisterChildPopover(child) {
    const index = this.childPopovers.indexOf(child);
    if (index > -1) {
      this.childPopovers.splice(index, 1);
    }
  }

  // ===== Private Methods =====

  _createPopover() {
    this.popover = document.createElement('div');
    this.popover.className = `five-thirty-popover ${this.className}`.trim();
    this.popover.setAttribute('data-placement', this.placement);
    this.popover.setAttribute('data-alignment', this.alignment);

    if (this.parentPopover) {
      this.popover.classList.add('five-thirty-popover--nested');
    }

    // Set content
    if (typeof this.content === 'function') {
      this.popover.innerHTML = this.content();
    } else {
      this.popover.innerHTML = this.content;
    }

    // Add to DOM
    document.body.appendChild(this.popover);
  }

  _updatePosition() {
    if (!this.popover || !this.anchor) return;

    if (SmartPopover.supportsAnchorPositioning) {
      this._applyAnchorPositioning();
    } else {
      this._applyManualPositioning();
    }
  }

  _applyAnchorPositioning() {
    // Set up CSS custom properties for anchor positioning
    const anchorName = `--${this.anchorId}`;
    this.anchor.style.anchorName = anchorName;
    this.popover.style.positionAnchor = anchorName;
    this.popover.style.position = 'fixed';
    this.popover.style.inset = 'auto';

    // Let CSS handle the positioning via classes
    // The CSS file defines position-area based on data-placement attribute
  }

  _applyManualPositioning() {
    const anchorRect = this.anchor.getBoundingClientRect();
    const popoverRect = this.popover.getBoundingClientRect();
    const viewport = {
      width: document.documentElement.clientWidth,
      height: document.documentElement.clientHeight
    };
    const padding = 8;

    let top, left;
    let actualPlacement = this.placement;

    // Calculate positions for all placements
    const positions = {
      bottom: {
        top: anchorRect.bottom + this.offset,
        left: this._getAlignedLeft(anchorRect, popoverRect)
      },
      top: {
        top: anchorRect.top - popoverRect.height - this.offset,
        left: this._getAlignedLeft(anchorRect, popoverRect)
      },
      left: {
        top: this._getAlignedTop(anchorRect, popoverRect),
        left: anchorRect.left - popoverRect.width - this.offset
      },
      right: {
        top: this._getAlignedTop(anchorRect, popoverRect),
        left: anchorRect.right + this.offset
      }
    };

    // Get initial position
    top = positions[this.placement].top;
    left = positions[this.placement].left;

    // Flip vertically if needed
    if (this.placement === 'bottom' && top + popoverRect.height > viewport.height - padding) {
      const spaceAbove = anchorRect.top - padding;
      const spaceBelow = viewport.height - anchorRect.bottom - padding;
      if (spaceAbove > spaceBelow) {
        actualPlacement = 'top';
        top = positions.top.top;
      }
    } else if (this.placement === 'top' && top < padding) {
      actualPlacement = 'bottom';
      top = positions.bottom.top;
    }

    // Horizontal clamping
    left = Math.max(padding, Math.min(left, viewport.width - popoverRect.width - padding));

    // Vertical clamping
    top = Math.max(padding, Math.min(top, viewport.height - popoverRect.height - padding));

    // Apply position
    this.popover.style.position = 'fixed';
    this.popover.style.top = `${top}px`;
    this.popover.style.left = `${left}px`;
    this.popover.setAttribute('data-actual-placement', actualPlacement);
  }

  _getAlignedLeft(anchorRect, popoverRect) {
    switch (this.alignment) {
      case 'start':
        return anchorRect.left;
      case 'center':
        return anchorRect.left + (anchorRect.width / 2) - (popoverRect.width / 2);
      case 'end':
        return anchorRect.right - popoverRect.width;
      default:
        return anchorRect.left;
    }
  }

  _getAlignedTop(anchorRect, popoverRect) {
    switch (this.alignment) {
      case 'start':
        return anchorRect.top;
      case 'center':
        return anchorRect.top + (anchorRect.height / 2) - (popoverRect.height / 2);
      case 'end':
        return anchorRect.bottom - popoverRect.height;
      default:
        return anchorRect.top;
    }
  }

  _setupEventListeners() {
    if (this.closeOnClickOutside) {
      // Use capture phase to handle before other handlers
      document.addEventListener('mousedown', this._boundClickOutside, true);
    }

    if (this.closeOnEscape) {
      document.addEventListener('keydown', this._boundEscape);
    }

    // Reposition on scroll and resize
    window.addEventListener('scroll', this._boundScroll, true);
    window.addEventListener('resize', this._boundResize);
  }

  _removeEventListeners() {
    document.removeEventListener('mousedown', this._boundClickOutside, true);
    document.removeEventListener('keydown', this._boundEscape);
    window.removeEventListener('scroll', this._boundScroll, true);
    window.removeEventListener('resize', this._boundResize);
  }

  _handleClickOutside(e) {
    if (!this.isOpen) return;

    // Check if click is inside this popover
    if (this.popover && this.popover.contains(e.target)) return;

    // Check if click is on the anchor
    if (this.anchor && this.anchor.contains(e.target)) return;

    // Check if click is inside any child popover
    const isInChild = this.childPopovers.some(child =>
      child.isOpen && child.popover && child.popover.contains(e.target)
    );
    if (isInChild) return;

    this.close();
  }

  _handleEscape(e) {
    if (e.key === 'Escape') {
      // Only close if this is the topmost popover in the stack
      const topmost = SmartPopover.openStack[SmartPopover.openStack.length - 1];
      if (topmost === this) {
        this.close();
        e.preventDefault();
        e.stopPropagation();
      }
    }
  }

  _handleScroll() {
    if (this.isOpen) {
      requestAnimationFrame(() => this._updatePosition());
    }
  }

  _handleResize() {
    if (this.isOpen) {
      requestAnimationFrame(() => this._updatePosition());
    }
  }
}

// Export for use in other scripts
window.SmartPopover = SmartPopover;
console.log('530: SmartPopover loaded and registered on window');
