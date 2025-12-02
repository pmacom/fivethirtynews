/**
 * Metadata Validation Service
 *
 * Validates and scores metadata quality from various extraction sources.
 * Provides fallback strategies and confidence scoring.
 */

import { ExtractedMetadata } from './MetadataExtractor';

export interface ValidationIssue {
  field: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface MetadataQuality {
  score: number; // 0-100
  completeness: number; // 0-100 (percentage of fields filled)
  confidence: 'high' | 'medium' | 'low';
  issues: ValidationIssue[];
  sources: string[]; // Which metadata sources were found
  hasTitle: boolean;
  hasDescription: boolean;
  hasAuthor: boolean;
  hasImage: boolean;
  hasDate: boolean;
}

export class MetadataValidator {
  /**
   * Validate and score extracted metadata
   */
  static validate(extracted: ExtractedMetadata, content?: {
    title?: string;
    description?: string;
    image?: string;
    author?: string;
    publishedDate?: string;
  }): MetadataQuality {
    const issues: ValidationIssue[] = [];
    const sources: string[] = [];
    let score = 0;

    // Track which metadata sources are present
    if (extracted.jsonLd) sources.push('jsonLd');
    if (extracted.openGraph) sources.push('openGraph');
    if (extracted.twitterCard) sources.push('twitterCard');
    if (extracted.oEmbed) sources.push('oEmbed');
    if (extracted.htmlMeta) sources.push('htmlMeta');

    // Validate title (required)
    const hasTitle = !!content?.title && content.title.length > 0;
    if (hasTitle) {
      score += 20;

      // Check title quality
      if (content.title.length < 10) {
        issues.push({
          field: 'title',
          severity: 'warning',
          message: 'Title is very short (< 10 chars)'
        });
      } else if (content.title.length > 200) {
        issues.push({
          field: 'title',
          severity: 'warning',
          message: 'Title is very long (> 200 chars)'
        });
      }

      // Check for generic titles
      const genericTitles = ['home', 'homepage', 'welcome', 'untitled', 'page'];
      if (genericTitles.some(g => content.title?.toLowerCase().includes(g))) {
        issues.push({
          field: 'title',
          severity: 'warning',
          message: 'Title appears to be generic'
        });
      }
    } else {
      issues.push({
        field: 'title',
        severity: 'error',
        message: 'Title is missing'
      });
    }

    // Validate description
    const hasDescription = !!content?.description && content.description.length > 0;
    if (hasDescription) {
      score += 15;

      // Check description quality
      if (content.description.length < 50) {
        issues.push({
          field: 'description',
          severity: 'info',
          message: 'Description is short (< 50 chars)'
        });
      } else if (content.description.length > 500) {
        issues.push({
          field: 'description',
          severity: 'info',
          message: 'Description is long (> 500 chars)'
        });
      }

      // Check if description is just title repeated
      if (content.title && content.description === content.title) {
        issues.push({
          field: 'description',
          severity: 'warning',
          message: 'Description is duplicate of title'
        });
        score -= 5;
      }
    } else {
      issues.push({
        field: 'description',
        severity: 'warning',
        message: 'Description is missing'
      });
    }

    // Validate author
    const hasAuthor = !!content?.author && content.author.length > 0;
    if (hasAuthor) {
      score += 20;

      // Check for generic author names
      const genericAuthors = ['admin', 'administrator', 'unknown', 'anonymous', 'user'];
      if (genericAuthors.some(g => content.author?.toLowerCase() === g)) {
        issues.push({
          field: 'author',
          severity: 'warning',
          message: 'Author name appears to be generic'
        });
        score -= 5;
      }
    } else {
      issues.push({
        field: 'author',
        severity: 'warning',
        message: 'Author is missing'
      });
    }

    // Validate image
    const hasImage = !!content?.image && this.isValidUrl(content.image);
    if (hasImage) {
      score += 15;

      // Check image URL validity
      if (!this.isValidImageUrl(content.image!)) {
        issues.push({
          field: 'image',
          severity: 'warning',
          message: 'Image URL may not be a valid image format'
        });
      }
    } else {
      issues.push({
        field: 'image',
        severity: 'info',
        message: 'Image/thumbnail is missing'
      });
    }

    // Validate published date
    const hasDate = !!content?.publishedDate;
    if (hasDate) {
      score += 10;

      // Check if date is in the future
      try {
        const date = new Date(content.publishedDate!);
        if (date > new Date()) {
          issues.push({
            field: 'publishedDate',
            severity: 'warning',
            message: 'Published date is in the future'
          });
          score -= 5;
        }
      } catch (e) {
        issues.push({
          field: 'publishedDate',
          severity: 'error',
          message: 'Published date is not a valid date'
        });
      }
    }

    // Bonus for multiple metadata sources (indicates rich metadata)
    if (sources.length >= 3) {
      score += 10;
    } else if (sources.length >= 2) {
      score += 5;
    }

    // Bonus for having JSON-LD (highest quality structured data)
    if (extracted.jsonLd) {
      score += 10;
    }

    // Calculate completeness (percentage of key fields filled)
    const totalFields = 5; // title, description, author, image, date
    const filledFields = [hasTitle, hasDescription, hasAuthor, hasImage, hasDate]
      .filter(Boolean).length;
    const completeness = Math.round((filledFields / totalFields) * 100);

    // Ensure score doesn't exceed 100
    score = Math.min(score, 100);

    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low';
    if (score >= 80 && sources.length >= 2) {
      confidence = 'high';
    } else if (score >= 50 && sources.length >= 1) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    return {
      score,
      completeness,
      confidence,
      issues,
      sources,
      hasTitle,
      hasDescription,
      hasAuthor,
      hasImage,
      hasDate
    };
  }

  /**
   * Check if string is a valid URL
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if URL is likely a valid image
   */
  private static isValidImageUrl(url: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const lowercaseUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowercaseUrl.includes(ext)) ||
           lowercaseUrl.includes('image') ||
           lowercaseUrl.includes('img') ||
           lowercaseUrl.includes('thumbnail') ||
           lowercaseUrl.includes('photo');
  }

  /**
   * Get fallback suggestions for missing fields
   */
  static getFallbackSuggestions(quality: MetadataQuality): string[] {
    const suggestions: string[] = [];

    if (!quality.hasTitle) {
      suggestions.push('Try extracting from URL path or filename');
      suggestions.push('Use domain name as fallback title');
    }

    if (!quality.hasDescription) {
      suggestions.push('Extract first paragraph from content');
      suggestions.push('Use meta keywords as description');
    }

    if (!quality.hasAuthor) {
      suggestions.push('Check for byline in content');
      suggestions.push('Look for author in URL structure');
    }

    if (!quality.hasImage) {
      suggestions.push('Use first image from page content');
      suggestions.push('Generate placeholder based on content type');
    }

    if (!quality.hasDate) {
      suggestions.push('Use current timestamp as fallback');
      suggestions.push('Check Last-Modified header');
    }

    return suggestions;
  }

  /**
   * Generate a summary report of metadata quality
   */
  static generateReport(quality: MetadataQuality): string {
    const lines: string[] = [];

    lines.push(`Metadata Quality Score: ${quality.score}/100`);
    lines.push(`Completeness: ${quality.completeness}%`);
    lines.push(`Confidence: ${quality.confidence}`);
    lines.push(`Sources Found: ${quality.sources.join(', ')}`);
    lines.push('');

    if (quality.issues.length > 0) {
      lines.push('Issues:');
      quality.issues.forEach(issue => {
        const icon = issue.severity === 'error' ? '❌' :
                     issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        lines.push(`  ${icon} ${issue.field}: ${issue.message}`);
      });
    } else {
      lines.push('✅ No issues found');
    }

    return lines.join('\n');
  }
}
