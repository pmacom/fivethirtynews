/**
 * Backfill Script: Extract creators from existing content
 *
 * This script:
 * 1. Fetches all content with author information
 * 2. Creates creator profiles for unique authors
 * 3. Links content to creators via author_id
 * 4. Calculates metadata quality for existing content
 */

// Load environment variables
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { supabase } from '../lib/supabase';
import { CreatorService } from '../lib/services/CreatorService';
import { MetadataValidator } from '../lib/services/MetadataValidator';

interface ContentWithAuthor {
  id: string;
  platform: string;
  platform_content_id: string;
  author_name: string | null;
  author_username: string | null;
  author_url: string | null;
  author_avatar_url: string | null;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  content_created_at: string | null;
  metadata: any;
  author_id: string | null;
}

async function backfillCreators() {
  console.log('🚀 Starting creator backfill process...\n');

  // Step 1: Fetch all content with author information
  console.log('📊 Fetching existing content...');
  const { data: allContent, error: fetchError } = await supabase
    .from('content')
    .select('*')
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('❌ Error fetching content:', fetchError);
    return;
  }

  console.log(`✅ Found ${allContent?.length || 0} content items\n`);

  if (!allContent || allContent.length === 0) {
    console.log('ℹ️  No content to process');
    return;
  }

  // Step 2: Group by unique authors and create creators
  const authorMap = new Map<string, ContentWithAuthor>();
  const contentToUpdate: Array<{ id: string; authorId: string; quality: any }> = [];

  console.log('👥 Processing authors...');
  let creatorsCreated = 0;
  let creatorsSkipped = 0;

  for (const content of allContent) {
    // Skip content without author information
    if (!content.author_username || !content.author_name) {
      continue;
    }

    const authorKey = `${content.platform}:${content.author_username.toLowerCase()}`;

    // Create creator if we haven't seen this author yet
    if (!authorMap.has(authorKey)) {
      authorMap.set(authorKey, content);

      try {
        console.log(`  Creating creator: ${content.author_name} (@${content.author_username}) on ${content.platform}`);

        const authorId = await CreatorService.getOrCreate({
          platform: content.platform,
          username: content.author_username,
          display_name: content.author_name,
          avatar_url: content.author_avatar_url || undefined,
          profile_url: content.author_url || undefined,
          verified: false
        });

        creatorsCreated++;

        // Calculate metadata quality for this content
        const metadataQuality = MetadataValidator.validate(
          content.metadata || {},
          {
            title: content.title || undefined,
            description: content.description || undefined,
            image: content.thumbnail_url || undefined,
            author: content.author_name || undefined,
            publishedDate: content.content_created_at || undefined
          }
        );

        contentToUpdate.push({
          id: content.id,
          authorId,
          quality: metadataQuality
        });

      } catch (error) {
        console.error(`  ❌ Error creating creator ${content.author_username}:`, error);
        creatorsSkipped++;
      }
    } else {
      // Author already exists, just link content
      const existingAuthorId = `${content.platform}:${content.author_username.toLowerCase()}`;

      const metadataQuality = MetadataValidator.validate(
        content.metadata || {},
        {
          title: content.title || undefined,
          description: content.description || undefined,
          image: content.thumbnail_url || undefined,
          author: content.author_name || undefined,
          publishedDate: content.content_created_at || undefined
        }
      );

      contentToUpdate.push({
        id: content.id,
        authorId: existingAuthorId,
        quality: metadataQuality
      });
    }
  }

  console.log(`\n✅ Created ${creatorsCreated} unique creators`);
  console.log(`⏭️  Skipped ${creatorsSkipped} creators due to errors\n`);

  // Step 3: Update content with author_id and metadata_quality
  console.log(`🔗 Linking ${contentToUpdate.length} content items to creators...`);

  let updated = 0;
  let failed = 0;

  for (const item of contentToUpdate) {
    const { error: updateError } = await supabase
      .from('content')
      .update({
        author_id: item.authorId,
        metadata_quality: item.quality
      })
      .eq('id', item.id);

    if (updateError) {
      console.error(`  ❌ Error updating content ${item.id}:`, updateError);
      failed++;
    } else {
      updated++;
      if (updated % 10 === 0) {
        console.log(`  Updated ${updated}/${contentToUpdate.length}...`);
      }
    }
  }

  console.log(`\n✅ Successfully linked ${updated} content items`);
  if (failed > 0) {
    console.log(`❌ Failed to link ${failed} content items`);
  }

  // Step 4: Update quality scores for all creators
  console.log('\n📊 Calculating quality scores for all creators...');

  const { data: creators, error: creatorsError } = await supabase
    .from('creators')
    .select('id');

  if (creatorsError) {
    console.error('❌ Error fetching creators:', creatorsError);
    return;
  }

  let scoresUpdated = 0;
  for (const creator of creators || []) {
    try {
      await CreatorService.updateQualityScore(creator.id);
      scoresUpdated++;
    } catch (error) {
      console.error(`  ❌ Error updating quality score for ${creator.id}:`, error);
    }
  }

  console.log(`✅ Updated quality scores for ${scoresUpdated} creators\n`);

  // Final summary
  console.log('🎉 Backfill complete!\n');
  console.log('Summary:');
  console.log(`  Creators created: ${creatorsCreated}`);
  console.log(`  Content items linked: ${updated}`);
  console.log(`  Quality scores calculated: ${scoresUpdated}`);
}

// Run the backfill
backfillCreators()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Backfill failed:', error);
    process.exit(1);
  });
