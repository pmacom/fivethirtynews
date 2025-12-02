import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { CreatorService } from '@/lib/services/CreatorService';
import { MetadataValidator } from '@/lib/services/MetadataValidator';

/**
 * POST /api/admin/backfill-creators
 * Backfill creator data from existing content
 */
export async function POST(request: NextRequest) {
  try {
    const results = {
      creatorsCreated: 0,
      creatorsSkipped: 0,
      contentLinked: 0,
      contentFailed: 0,
      qualityScoresUpdated: 0,
      log: [] as string[]
    };

    results.log.push('🚀 Starting creator backfill process...\n');

    // Step 1: Fetch all content with author information
    results.log.push('📊 Fetching existing content...');
    const { data: allContent, error: fetchError } = await supabase
      .from('content')
      .select('*')
      .order('created_at', { ascending: true });

    if (fetchError) {
      results.log.push(`❌ Error fetching content: ${fetchError.message}`);
      return NextResponse.json({ success: false, error: fetchError.message, results }, { status: 500 });
    }

    results.log.push(`✅ Found ${allContent?.length || 0} content items\n`);

    if (!allContent || allContent.length === 0) {
      results.log.push('ℹ️  No content to process');
      return NextResponse.json({ success: true, results });
    }

    // Step 2: Group by unique authors and create creators
    const authorMap = new Map<string, any>();
    const contentToUpdate: Array<{ id: string; authorId: string; quality: any }> = [];

    results.log.push('👥 Processing authors...');

    for (const content of allContent) {
      // Skip content without author information
      if (!content.author_name) {
        continue;
      }

      // Extract username from author_name if author_username is missing
      let username = content.author_username;
      if (!username) {
        // Try to extract from author_name (e.g., "Dr Singularity@Dr_Singularity·3h" or "testuser")
        const usernameMatch = content.author_name.match(/@([A-Za-z0-9_-]+)/);
        if (usernameMatch) {
          username = usernameMatch[1];
        } else {
          // Use author_name as username if no @ found
          username = content.author_name.split(/[·\s]/)[0].replace(/[^A-Za-z0-9_-]/g, '');
        }
      }

      if (!username) {
        results.log.push(`  ⏭️  Skipping content ${content.id} - no valid username`);
        continue;
      }

      const authorKey = `${content.platform}:${username.toLowerCase()}`;

      // Create creator if we haven't seen this author yet
      if (!authorMap.has(authorKey)) {
        authorMap.set(authorKey, content);

        try {
          results.log.push(`  Creating creator: ${content.author_name} (@${username}) on ${content.platform}`);

          const authorId = await CreatorService.getOrCreate({
            platform: content.platform,
            username: username,
            display_name: content.author_name,
            avatar_url: content.author_avatar_url || undefined,
            profile_url: content.author_url || undefined,
            verified: false
          });

          results.creatorsCreated++;

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
          results.log.push(`  ❌ Error creating creator ${username}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          results.creatorsSkipped++;
        }
      } else {
        // Author already exists, just link content
        const existingAuthorId = `${content.platform}:${username.toLowerCase()}`;

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

    results.log.push(`\n✅ Created ${results.creatorsCreated} unique creators`);
    results.log.push(`⏭️  Skipped ${results.creatorsSkipped} creators due to errors\n`);

    // Step 3: Update content with author_id and metadata_quality
    results.log.push(`🔗 Linking ${contentToUpdate.length} content items to creators...`);

    for (const item of contentToUpdate) {
      const { error: updateError } = await supabase
        .from('content')
        .update({
          author_id: item.authorId,
          metadata_quality: item.quality
        })
        .eq('id', item.id);

      if (updateError) {
        results.log.push(`  ❌ Error updating content ${item.id}: ${updateError.message}`);
        results.contentFailed++;
      } else {
        results.contentLinked++;
        if (results.contentLinked % 10 === 0) {
          results.log.push(`  Updated ${results.contentLinked}/${contentToUpdate.length}...`);
        }
      }
    }

    results.log.push(`\n✅ Successfully linked ${results.contentLinked} content items`);
    if (results.contentFailed > 0) {
      results.log.push(`❌ Failed to link ${results.contentFailed} content items`);
    }

    // Step 4: Update quality scores for all creators
    results.log.push('\n📊 Calculating quality scores for all creators...');

    const { data: creators, error: creatorsError } = await supabase
      .from('creators')
      .select('id');

    if (creatorsError) {
      results.log.push(`❌ Error fetching creators: ${creatorsError.message}`);
      return NextResponse.json({ success: false, error: creatorsError.message, results }, { status: 500 });
    }

    for (const creator of creators || []) {
      try {
        await CreatorService.updateQualityScore(creator.id);
        results.qualityScoresUpdated++;
      } catch (error) {
        results.log.push(`  ❌ Error updating quality score for ${creator.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    results.log.push(`✅ Updated quality scores for ${results.qualityScoresUpdated} creators\n`);

    // Final summary
    results.log.push('🎉 Backfill complete!\n');
    results.log.push('Summary:');
    results.log.push(`  Creators created: ${results.creatorsCreated}`);
    results.log.push(`  Content items linked: ${results.contentLinked}`);
    results.log.push(`  Quality scores calculated: ${results.qualityScoresUpdated}`);

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Backfill error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
