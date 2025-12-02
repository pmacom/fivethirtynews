/**
 * Metadata Extractor Service
 *
 * Fetches and extracts rich metadata from URLs using various strategies:
 * 1. Open Graph tags (<meta property="og:*">)
 * 2. Twitter Card tags (<meta name="twitter:*">)
 * 3. oEmbed API endpoints
 * 4. Standard HTML meta tags
 *
 * Replaces the rich metadata that Discord embeds provided automatically.
 */

export interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
  url?: string;
  type?: string; // article, video, website, etc.
  siteName?: string;
  video?: string;
  videoWidth?: number;
  videoHeight?: number;
  author?: string;
  publishedTime?: string;
}

export interface TwitterCardData {
  card?: string; // summary, summary_large_image, player, app
  title?: string;
  description?: string;
  image?: string;
  creator?: string;
  site?: string;
}

export interface OEmbedData {
  type: string; // photo, video, link, rich
  version: string;
  title?: string;
  author_name?: string;
  author_url?: string;
  provider_name?: string;
  provider_url?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
  width?: number;
  height?: number;
  html?: string; // Embed HTML
}

export interface JsonLdData {
  '@type'?: string; // Article, Person, Organization, VideoObject, etc.
  headline?: string;
  name?: string;
  description?: string;
  image?: string | string[] | { url: string }[];
  author?: {
    '@type'?: string;
    name?: string;
    url?: string;
    image?: string;
  } | string;
  publisher?: {
    '@type'?: string;
    name?: string;
    logo?: string | { url: string };
  };
  datePublished?: string;
  dateModified?: string;
  articleSection?: string;
  keywords?: string[];
  thumbnailUrl?: string;
  uploadDate?: string;
  duration?: string;
}

export interface ExtractedMetadata {
  openGraph?: OpenGraphData;
  twitterCard?: TwitterCardData;
  oEmbed?: OEmbedData;
  jsonLd?: JsonLdData;
  htmlMeta?: {
    title?: string;
    description?: string;
    author?: string;
    keywords?: string;
  };
}

export class MetadataExtractor {
  /**
   * oEmbed endpoint mappings for supported platforms
   */
  private static oEmbedEndpoints: Record<string, string> = {
    youtube: 'https://www.youtube.com/oembed',
    twitter: 'https://publish.twitter.com/oembed',
    vimeo: 'https://vimeo.com/api/oembed.json',
    reddit: 'https://www.reddit.com/oembed',
    // Add more as needed
  };

  /**
   * Extract Open Graph metadata from HTML
   */
  static extractOpenGraph(html: string): OpenGraphData {
    const og: OpenGraphData = {};

    // Extract og: meta tags
    const ogPattern = /<meta\s+property=["']og:([^"']+)["']\s+content=["']([^"']+)["']\s*\/?>/gi;
    let match;

    while ((match = ogPattern.exec(html)) !== null) {
      const property = match[1];
      const content = match[2];

      switch (property) {
        case 'title':
          og.title = content;
          break;
        case 'description':
          og.description = content;
          break;
        case 'image':
          og.image = content;
          break;
        case 'image:width':
          og.imageWidth = parseInt(content, 10);
          break;
        case 'image:height':
          og.imageHeight = parseInt(content, 10);
          break;
        case 'url':
          og.url = content;
          break;
        case 'type':
          og.type = content;
          break;
        case 'site_name':
          og.siteName = content;
          break;
        case 'video':
          og.video = content;
          break;
        case 'video:width':
          og.videoWidth = parseInt(content, 10);
          break;
        case 'video:height':
          og.videoHeight = parseInt(content, 10);
          break;
        case 'article:author':
          og.author = content;
          break;
        case 'article:published_time':
          og.publishedTime = content;
          break;
      }
    }

    return og;
  }

  /**
   * Extract Twitter Card metadata from HTML
   */
  static extractTwitterCard(html: string): TwitterCardData {
    const twitter: TwitterCardData = {};

    // Extract twitter: meta tags
    const twitterPattern = /<meta\s+name=["']twitter:([^"']+)["']\s+content=["']([^"']+)["']\s*\/?>/gi;
    let match;

    while ((match = twitterPattern.exec(html)) !== null) {
      const property = match[1];
      const content = match[2];

      switch (property) {
        case 'card':
          twitter.card = content;
          break;
        case 'title':
          twitter.title = content;
          break;
        case 'description':
          twitter.description = content;
          break;
        case 'image':
          twitter.image = content;
          break;
        case 'creator':
          twitter.creator = content;
          break;
        case 'site':
          twitter.site = content;
          break;
      }
    }

    return twitter;
  }

  /**
   * Extract JSON-LD structured data
   */
  static extractJsonLd(html: string): JsonLdData | null {
    try {
      // Find all JSON-LD script tags
      const scriptPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
      let match;
      const jsonLdObjects: any[] = [];

      while ((match = scriptPattern.exec(html)) !== null) {
        try {
          const jsonContent = match[1].trim();
          const parsed = JSON.parse(jsonContent);

          // Handle @graph arrays
          if (parsed['@graph'] && Array.isArray(parsed['@graph'])) {
            jsonLdObjects.push(...parsed['@graph']);
          } else if (Array.isArray(parsed)) {
            jsonLdObjects.push(...parsed);
          } else {
            jsonLdObjects.push(parsed);
          }
        } catch (e) {
          // Skip invalid JSON
          continue;
        }
      }

      if (jsonLdObjects.length === 0) return null;

      // Find the most relevant object (Article, NewsArticle, VideoObject, Person)
      const relevantTypes = ['Article', 'NewsArticle', 'BlogPosting', 'VideoObject', 'WebPage'];
      let primaryObject = jsonLdObjects.find(obj =>
        relevantTypes.includes(obj['@type'])
      ) || jsonLdObjects[0];

      // Extract and normalize data
      const jsonLd: JsonLdData = {
        '@type': primaryObject['@type']
      };

      // Extract title (headline or name)
      jsonLd.headline = primaryObject.headline;
      jsonLd.name = primaryObject.name;

      // Extract description
      jsonLd.description = primaryObject.description || primaryObject.abstract;

      // Extract image
      if (primaryObject.image) {
        if (typeof primaryObject.image === 'string') {
          jsonLd.image = primaryObject.image;
        } else if (Array.isArray(primaryObject.image)) {
          jsonLd.image = primaryObject.image[0]?.url || primaryObject.image[0];
        } else if (primaryObject.image.url) {
          jsonLd.image = primaryObject.image.url;
        }
      }

      // Extract author
      if (primaryObject.author) {
        if (typeof primaryObject.author === 'string') {
          jsonLd.author = primaryObject.author;
        } else if (primaryObject.author.name) {
          jsonLd.author = {
            '@type': primaryObject.author['@type'],
            name: primaryObject.author.name,
            url: primaryObject.author.url,
            image: primaryObject.author.image?.url || primaryObject.author.image
          };
        }
      }

      // Extract publisher
      if (primaryObject.publisher) {
        jsonLd.publisher = {
          '@type': primaryObject.publisher['@type'],
          name: primaryObject.publisher.name,
          logo: primaryObject.publisher.logo?.url || primaryObject.publisher.logo
        };
      }

      // Extract dates
      jsonLd.datePublished = primaryObject.datePublished || primaryObject.uploadDate;
      jsonLd.dateModified = primaryObject.dateModified;
      jsonLd.uploadDate = primaryObject.uploadDate;

      // Extract other metadata
      jsonLd.articleSection = primaryObject.articleSection;
      jsonLd.keywords = primaryObject.keywords;
      jsonLd.thumbnailUrl = primaryObject.thumbnailUrl;
      jsonLd.duration = primaryObject.duration;

      return jsonLd;
    } catch (error) {
      console.error('Error extracting JSON-LD:', error);
      return null;
    }
  }

  /**
   * Extract standard HTML meta tags
   */
  static extractHtmlMeta(html: string): { title?: string; description?: string; author?: string; keywords?: string } {
    const meta: { title?: string; description?: string; author?: string; keywords?: string } = {};

    // Extract title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      meta.title = titleMatch[1].trim();
    }

    // Extract meta description
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']\s*\/?>/i);
    if (descMatch) {
      meta.description = descMatch[1];
    }

    // Extract author
    const authorMatch = html.match(/<meta\s+name=["']author["']\s+content=["']([^"']+)["']\s*\/?>/i);
    if (authorMatch) {
      meta.author = authorMatch[1];
    }

    // Extract keywords
    const keywordsMatch = html.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']+)["']\s*\/?>/i);
    if (keywordsMatch) {
      meta.keywords = keywordsMatch[1];
    }

    return meta;
  }

  /**
   * Fetch and parse Open Graph data from URL
   */
  static async fetchOpenGraph(url: string): Promise<OpenGraphData | null> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; 530Bot/1.0; +https://530.social)'
        }
      });

      if (!response.ok) {
        return null;
      }

      const html = await response.text();
      return this.extractOpenGraph(html);
    } catch (error) {
      console.error('Error fetching Open Graph data:', error);
      return null;
    }
  }

  /**
   * Fetch oEmbed data for URL
   */
  static async fetchOEmbed(url: string, platform?: string): Promise<OEmbedData | null> {
    try {
      // Determine oEmbed endpoint
      let endpoint: string | undefined;

      if (platform && this.oEmbedEndpoints[platform]) {
        endpoint = this.oEmbedEndpoints[platform];
      } else {
        // Try to detect platform from URL
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          endpoint = this.oEmbedEndpoints.youtube;
        } else if (url.includes('twitter.com') || url.includes('x.com')) {
          endpoint = this.oEmbedEndpoints.twitter;
        } else if (url.includes('vimeo.com')) {
          endpoint = this.oEmbedEndpoints.vimeo;
        } else if (url.includes('reddit.com')) {
          endpoint = this.oEmbedEndpoints.reddit;
        }
      }

      if (!endpoint) {
        return null;
      }

      // Fetch oEmbed data
      const oembedUrl = `${endpoint}?url=${encodeURIComponent(url)}&format=json`;
      const response = await fetch(oembedUrl);

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching oEmbed data:', error);
      return null;
    }
  }

  /**
   * Extract all metadata from URL
   */
  static async extractAll(url: string): Promise<ExtractedMetadata> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; 530Bot/1.0; +https://530.social)'
        }
      });

      if (!response.ok) {
        return {};
      }

      const html = await response.text();

      return {
        jsonLd: this.extractJsonLd(html),
        openGraph: this.extractOpenGraph(html),
        twitterCard: this.extractTwitterCard(html),
        htmlMeta: this.extractHtmlMeta(html)
      };
    } catch (error) {
      console.error('Error extracting metadata:', error);
      return {};
    }
  }

  /**
   * Get best available metadata, preferring JSON-LD → Open Graph → Twitter Card → HTML Meta
   */
  static getBestMetadata(extracted: ExtractedMetadata): {
    title?: string;
    description?: string;
    image?: string;
    author?: string;
    authorUrl?: string;
    authorAvatar?: string;
    publishedDate?: string;
    publisher?: string;
  } {
    // Extract author information from JSON-LD
    let authorName: string | undefined;
    let authorUrl: string | undefined;
    let authorAvatar: string | undefined;

    if (extracted.jsonLd?.author) {
      if (typeof extracted.jsonLd.author === 'string') {
        authorName = extracted.jsonLd.author;
      } else {
        authorName = extracted.jsonLd.author.name;
        authorUrl = extracted.jsonLd.author.url;
        authorAvatar = extracted.jsonLd.author.image;
      }
    }

    // Fallback to other sources for author
    if (!authorName) {
      authorName = extracted.openGraph?.author ||
                   extracted.twitterCard?.creator ||
                   extracted.htmlMeta?.author;
    }

    // Get image from JSON-LD (handle different formats)
    let jsonLdImage: string | undefined;
    if (extracted.jsonLd?.image) {
      if (typeof extracted.jsonLd.image === 'string') {
        jsonLdImage = extracted.jsonLd.image;
      } else if (Array.isArray(extracted.jsonLd.image)) {
        jsonLdImage = typeof extracted.jsonLd.image[0] === 'string'
          ? extracted.jsonLd.image[0]
          : extracted.jsonLd.image[0]?.url;
      }
    }

    return {
      title: extracted.jsonLd?.headline ||
             extracted.jsonLd?.name ||
             extracted.openGraph?.title ||
             extracted.twitterCard?.title ||
             extracted.htmlMeta?.title,
      description: extracted.jsonLd?.description ||
                   extracted.openGraph?.description ||
                   extracted.twitterCard?.description ||
                   extracted.htmlMeta?.description,
      image: jsonLdImage ||
             extracted.openGraph?.image ||
             extracted.twitterCard?.image,
      author: authorName,
      authorUrl: authorUrl,
      authorAvatar: authorAvatar,
      publishedDate: extracted.jsonLd?.datePublished ||
                     extracted.openGraph?.publishedTime,
      publisher: extracted.jsonLd?.publisher?.name ||
                 extracted.openGraph?.siteName
    };
  }
}
