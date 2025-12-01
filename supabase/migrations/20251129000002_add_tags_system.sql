-- Add tags table for storing reusable additional tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Add additional_tags column to content table
ALTER TABLE content
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Create index for tag lookups
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_usage ON tags(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_content_tags ON content USING GIN(tags);

-- Insert common initial tags
INSERT INTO tags (slug, name, usage_count) VALUES
  -- 3D/Graphics
  ('normal-map', 'Normal Map', 0),
  ('depth-map', 'Depth Map', 0),
  ('pbr', 'PBR', 0),
  ('raytracing', 'Raytracing', 0),
  ('pathtracing', 'Path Tracing', 0),
  ('rasterization', 'Rasterization', 0),
  ('rendering', 'Rendering', 0),
  ('lighting', 'Lighting', 0),
  ('shadows', 'Shadows', 0),
  ('reflections', 'Reflections', 0),
  ('textures', 'Textures', 0),
  ('materials', 'Materials', 0),
  ('mesh', 'Mesh', 0),
  ('geometry', 'Geometry', 0),
  ('instancing', 'Instancing', 0),
  ('lod', 'LOD', 0),
  ('culling', 'Culling', 0),
  -- Shaders
  ('vertex-shader', 'Vertex Shader', 0),
  ('fragment-shader', 'Fragment Shader', 0),
  ('compute-shader', 'Compute Shader', 0),
  ('glsl', 'GLSL', 0),
  ('hlsl', 'HLSL', 0),
  ('wgsl', 'WGSL', 0),
  ('sdf', 'SDF', 0),
  ('noise', 'Noise', 0),
  -- Tech/Platforms
  ('webgl', 'WebGL', 0),
  ('webgpu', 'WebGPU', 0),
  ('vulkan', 'Vulkan', 0),
  ('directx', 'DirectX', 0),
  ('metal', 'Metal', 0),
  ('opengl', 'OpenGL', 0),
  ('wasm', 'WASM', 0),
  ('rust', 'Rust', 0),
  ('typescript', 'TypeScript', 0),
  ('python', 'Python', 0),
  ('cpp', 'C++', 0),
  -- XR
  ('vr', 'VR', 0),
  ('ar', 'AR', 0),
  ('xr', 'XR', 0),
  ('quest', 'Quest', 0),
  ('vision-pro', 'Vision Pro', 0),
  -- Animation/Motion
  ('animation', 'Animation', 0),
  ('skeletal', 'Skeletal', 0),
  ('rigging', 'Rigging', 0),
  ('motion-capture', 'Motion Capture', 0),
  ('ik', 'IK', 0),
  ('blend-shapes', 'Blend Shapes', 0),
  -- Simulation
  ('physics', 'Physics', 0),
  ('particle', 'Particle', 0),
  ('fluid', 'Fluid', 0),
  ('cloth', 'Cloth', 0),
  ('softbody', 'Softbody', 0),
  ('collision', 'Collision', 0),
  -- Procedural
  ('procedural', 'Procedural', 0),
  ('generative', 'Generative', 0),
  ('terrain', 'Terrain', 0),
  ('voxel', 'Voxel', 0),
  ('marching-cubes', 'Marching Cubes', 0),
  ('wave-function-collapse', 'Wave Function Collapse', 0),
  -- AI/ML
  ('ai-generated', 'AI Generated', 0),
  ('neural-rendering', 'Neural Rendering', 0),
  ('nerf', 'NeRF', 0),
  ('gaussian-splatting', 'Gaussian Splatting', 0),
  ('diffusion', 'Diffusion', 0),
  ('image-gen', 'Image Gen', 0),
  ('video-gen', 'Video Gen', 0),
  ('llm', 'LLM', 0),
  ('stable-diffusion', 'Stable Diffusion', 0),
  ('comfyui', 'ComfyUI', 0),
  ('lora', 'LoRA', 0),
  ('controlnet', 'ControlNet', 0),
  ('upscaling', 'Upscaling', 0),
  ('inpainting', 'Inpainting', 0),
  -- Content Types
  ('tutorial', 'Tutorial', 0),
  ('demo', 'Demo', 0),
  ('showcase', 'Showcase', 0),
  ('breakdown', 'Breakdown', 0),
  ('behind-the-scenes', 'Behind the Scenes', 0),
  ('comparison', 'Comparison', 0),
  ('benchmark', 'Benchmark', 0),
  ('devlog', 'Devlog', 0),
  ('postmortem', 'Postmortem', 0),
  -- Project Types
  ('open-source', 'Open Source', 0),
  ('tool', 'Tool', 0),
  ('library', 'Library', 0),
  ('framework', 'Framework', 0),
  ('plugin', 'Plugin', 0),
  ('extension', 'Extension', 0),
  ('release', 'Release', 0),
  ('update', 'Update', 0),
  ('beta', 'Beta', 0),
  ('alpha', 'Alpha', 0),
  -- Performance
  ('realtime', 'Realtime', 0),
  ('optimization', 'Optimization', 0),
  ('performance', 'Performance', 0),
  ('mobile', 'Mobile', 0),
  ('low-poly', 'Low Poly', 0),
  -- Game Dev
  ('game-dev', 'Game Dev', 0),
  ('indie', 'Indie', 0),
  ('retro', 'Retro', 0),
  ('pixel-art', 'Pixel Art', 0),
  ('2d', '2D', 0),
  ('3d', '3D', 0),
  ('isometric', 'Isometric', 0),
  -- Audio
  ('audio', 'Audio', 0),
  ('music', 'Music', 0),
  ('sound-design', 'Sound Design', 0),
  ('spatial-audio', 'Spatial Audio', 0),
  -- Other
  ('free', 'Free', 0),
  ('paid', 'Paid', 0),
  ('hiring', 'Hiring', 0),
  ('job', 'Job', 0),
  ('event', 'Event', 0),
  ('conference', 'Conference', 0),
  ('research', 'Research', 0),
  ('paper', 'Paper', 0),
  -- AI Companies/Labs
  ('openai', 'OpenAI', 0),
  ('anthropic', 'Anthropic', 0),
  ('google', 'Google', 0),
  ('google-deepmind', 'Google DeepMind', 0),
  ('meta', 'Meta', 0),
  ('meta-ai', 'Meta AI', 0),
  ('microsoft', 'Microsoft', 0),
  ('nvidia', 'NVIDIA', 0),
  ('adobe', 'Adobe', 0),
  ('stability-ai', 'Stability AI', 0),
  ('midjourney', 'Midjourney', 0),
  ('runway', 'Runway', 0),
  ('pika', 'Pika', 0),
  ('eleven-labs', 'ElevenLabs', 0),
  ('suno', 'Suno', 0),
  ('udio', 'Udio', 0),
  ('huggingface', 'Hugging Face', 0),
  ('replicate', 'Replicate', 0),
  -- Tech Companies
  ('apple', 'Apple', 0),
  ('amazon', 'Amazon', 0),
  ('unity-tech', 'Unity Technologies', 0),
  ('epic', 'Epic Games', 0),
  ('autodesk', 'Autodesk', 0),
  ('foundry', 'Foundry', 0),
  ('maxon', 'Maxon', 0),
  ('sidefx', 'SideFX', 0),
  ('pixar', 'Pixar', 0),
  -- AI Models
  ('gpt', 'GPT', 0),
  ('gpt-4', 'GPT-4', 0),
  ('claude', 'Claude', 0),
  ('gemini', 'Gemini', 0),
  ('llama', 'Llama', 0),
  ('mistral', 'Mistral', 0),
  ('flux', 'Flux', 0),
  ('sdxl', 'SDXL', 0),
  ('sd3', 'SD3', 0),
  ('dalle', 'DALL-E', 0),
  ('sora', 'Sora', 0),
  ('kling', 'Kling', 0),
  ('wan', 'Wan', 0),
  ('veo', 'Veo', 0),
  -- Software/Tools
  ('houdini', 'Houdini', 0),
  ('maya', 'Maya', 0),
  ('cinema4d', 'Cinema 4D', 0),
  ('zbrush', 'ZBrush', 0),
  ('substance', 'Substance', 0),
  ('marvelous-designer', 'Marvelous Designer', 0),
  ('nuke', 'Nuke', 0),
  ('davinci-resolve', 'DaVinci Resolve', 0),
  ('after-effects', 'After Effects', 0),
  ('premiere', 'Premiere', 0),
  ('figma', 'Figma', 0),
  ('cursor', 'Cursor', 0),
  ('replit', 'Replit', 0),
  ('vercel', 'Vercel', 0),
  ('supabase', 'Supabase', 0)
ON CONFLICT (slug) DO NOTHING;

-- Function to get tag usage counts from content.tags array
CREATE OR REPLACE FUNCTION get_tag_usage_counts()
RETURNS TABLE(tag_slug TEXT, usage_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT
    unnest(tags) as tag_slug,
    COUNT(*)::BIGINT as usage_count
  FROM content
  WHERE array_length(tags, 1) > 0
  GROUP BY unnest(tags)
  ORDER BY usage_count DESC;
END;
$$ LANGUAGE plpgsql;
