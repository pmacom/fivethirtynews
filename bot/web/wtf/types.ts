import { LiveViewContentBlock, LiveViewContentBlockItems } from './Content/types';

/**
 * Props for the WTF 3D Content Viewer component
 */
export interface WTFProps {
  /**
   * Required: Content data to display in the 3D viewer
   */
  content: LiveViewContentBlock[];

  /**
   * Optional: Initial category ID to display
   * If not provided, defaults to first category
   */
  initialCategoryId?: string;

  /**
   * Optional: Initial item ID to display
   * If not provided, defaults to first item in first category
   */
  initialItemId?: string;

  /**
   * Optional: Callback fired when category changes
   * @param categoryId - The ID of the new active category
   * @param categoryIndex - The index of the new active category
   */
  onCategoryChange?: (categoryId: string, categoryIndex: number) => void;

  /**
   * Optional: Callback fired when item changes
   * @param itemId - The ID of the new active item
   * @param itemIndex - The index of the new active item within the category
   * @param itemData - The full data object of the new active item
   */
  onItemChange?: (itemId: string, itemIndex: number, itemData: LiveViewContentBlockItems) => void;

  /**
   * Optional: Callback fired when user clicks an item
   * @param itemData - The full data object of the clicked item
   */
  onItemClick?: (itemData: LiveViewContentBlockItems) => void;

  /**
   * Optional: Show/hide the navigation legend sidebar
   * @default true
   */
  showLegend?: boolean;

  /**
   * Optional: Show/hide the content details panel
   * @default true
   */
  showDetails?: boolean;

  /**
   * Optional: Custom 3D models/objects to render in the scene
   * Useful for adding logos, decorations, or other 3D elements
   */
  children?: React.ReactNode;

  /**
   * Optional: Enable audio reactivity plugin
   * Adds audio analysis and audio-reactive features
   * @default false
   */
  enableAudio?: boolean;

  /**
   * Optional: Enable development controls (Leva panel)
   * Useful for debugging and tweaking 3D parameters
   * @default false
   */
  enableDevControls?: boolean;

  /**
   * Optional: Enable keyboard navigation
   * Arrow keys to navigate content
   * @default true
   */
  enableKeyboard?: boolean;

  /**
   * Optional: Enable swipe/touch navigation
   * Touch gestures to navigate content
   * @default true
   */
  enableSwipe?: boolean;

  /**
   * Optional: Custom class name for the wrapper div
   */
  className?: string;
}

/**
 * Configuration object for WTF viewer
 */
export interface WTFConfig {
  useRelativeImagePaths: boolean;
}
