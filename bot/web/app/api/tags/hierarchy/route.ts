import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface Tag {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  depth: number;
  path: string;
}

interface HierarchyTag extends Tag {
  children: HierarchyTag[];
}

/**
 * Build hierarchical structure from flat tag list
 */
function buildHierarchy(tags: Tag[]): HierarchyTag[] {
  const tagMap: { [key: string]: HierarchyTag } = {};
  const roots: HierarchyTag[] = [];

  // Create map of all tags with children array
  tags.forEach(tag => {
    tagMap[tag.id] = { ...tag, children: [] };
  });

  // Build hierarchy
  tags.forEach(tag => {
    if (tag.parent_id === null || tag.parent_id === undefined) {
      // Root level tag
      roots.push(tagMap[tag.id]);
    } else if (tagMap[tag.parent_id]) {
      // Child tag - add to parent's children
      tagMap[tag.parent_id].children.push(tagMap[tag.id]);
    } else {
      // Parent doesn't exist, treat as root
      roots.push(tagMap[tag.id]);
    }
  });

  return roots;
}

/**
 * OPTIONS /api/tags/hierarchy
 * Handle preflight requests
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/tags/hierarchy
 * Get hierarchical tag structure
 */
export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('tags')
      .select('id, slug, name, description, parent_id, depth, path')
      .order('depth', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching tags:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tags' },
        { status: 500 }
      );
    }

    // Build hierarchy structure
    const hierarchy = buildHierarchy(data);

    return NextResponse.json({
      success: true,
      data: hierarchy
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
