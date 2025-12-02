-- Add comprehensive logical relationships between tags
-- This migration adds semantic connections based on domain knowledge
-- Relationship types: related, tool_of, technique_of, part_of
-- Strength scale: 0.9-1.0 very strong, 0.7-0.89 strong, 0.5-0.69 moderate

DO $$
DECLARE
  v_count INTEGER := 0;
  -- Tag IDs for reuse
  ai_id UUID;
  code_id UUID;
  web_dev_id UUID;
  three_d_id UUID;
  metaverse_id UUID;
  ml_id UUID;
  modifiers_tools_id UUID;
  modifiers_learning_id UUID;
  modifiers_security_id UUID;
  modifiers_ethics_id UUID;
  modifiers_datasets_id UUID;
BEGIN
  -- Get commonly referenced tag IDs
  SELECT id INTO ai_id FROM tags WHERE slug = 'ai';
  SELECT id INTO code_id FROM tags WHERE slug = 'code';
  SELECT id INTO web_dev_id FROM tags WHERE slug = 'web-development';
  SELECT id INTO three_d_id FROM tags WHERE slug = '3d-development';
  SELECT id INTO metaverse_id FROM tags WHERE slug = 'metaverse';
  SELECT id INTO ml_id FROM tags WHERE slug = 'machine-learning';
  SELECT id INTO modifiers_tools_id FROM tags WHERE slug = 'tools';
  SELECT id INTO modifiers_learning_id FROM tags WHERE slug = 'learning';
  SELECT id INTO modifiers_security_id FROM tags WHERE slug = 'security';
  SELECT id INTO modifiers_ethics_id FROM tags WHERE slug = 'ethics';
  SELECT id INTO modifiers_datasets_id FROM tags WHERE slug = 'datasets';

  -- ===========================================
  -- 3D DEVELOPMENT RELATIONSHIPS
  -- ===========================================

  -- Modeling tools and software
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.85
  FROM tags t1, tags t2
  WHERE t1.slug = 'modeling-tools' AND t2.slug = 'generative-design'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'technique_of', 0.87
  FROM tags t1, tags t2
  WHERE t1.slug = 'depth-scanning' AND t2.slug = '3d-development'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'technique_of', 0.91
  FROM tags t1, tags t2
  WHERE t1.slug = 'gaussian-splatting' AND t2.slug = '3d-development'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.80
  FROM tags t1, tags t2
  WHERE t1.slug = 'gaussian-splatting' AND t2.slug = 'depth-scanning'
  ON CONFLICT DO NOTHING;

  -- Game engines cross-relations
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.88
  FROM tags t1, tags t2
  WHERE t1.slug = 'unity' AND t2.slug = 'unreal-engine'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.82
  FROM tags t1, tags t2
  WHERE t1.slug = 'godot' AND t2.slug = 'unity'
  ON CONFLICT DO NOTHING;

  -- ===========================================
  -- AI RELATIONSHIPS
  -- ===========================================

  -- Machine Learning as foundation
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'part_of', 0.93
  FROM tags t1, tags t2
  WHERE t1.slug = 'machine-learning' AND t2.slug = 'ai'
  ON CONFLICT DO NOTHING;

  -- LLM relationships
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'part_of', 0.90
  FROM tags t1, tags t2
  WHERE t1.slug = 'llm' AND t2.slug = 'ai'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.92
  FROM tags t1, tags t2
  WHERE t1.slug = 'llm' AND t2.slug = 'machine-learning'
  ON CONFLICT DO NOTHING;

  -- Open source models connections
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.88
  FROM tags t1, tags t2
  WHERE t1.slug = 'open-source-models' AND t2.slug = 'llm'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.85
  FROM tags t1, tags t2
  WHERE t1.slug = 'open-source-models' AND t2.slug = 'hugging-face'
  ON CONFLICT DO NOTHING;

  -- AI content generation
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.75
  FROM tags t1, tags t2
  WHERE t1.slug = 'ai-art' AND t2.slug = 'ai-video'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.78
  FROM tags t1, tags t2
  WHERE t1.slug = 'ai-art' AND t2.slug = 'generative-design'
  ON CONFLICT DO NOTHING;

  -- AI workflows
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'part_of', 0.84
  FROM tags t1, tags t2
  WHERE t1.slug = 'ai-workflows' AND t2.slug = 'ai'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.82
  FROM tags t1, tags t2
  WHERE t1.slug = 'ai-workflows' AND t2.slug = 'machine-learning'
  ON CONFLICT DO NOTHING;

  -- ===========================================
  -- CODE RELATIONSHIPS
  -- ===========================================

  -- IDEs and tools
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'tool_of', 0.85
  FROM tags t1, tags t2
  WHERE t1.slug = 'eclipse-android-studio' AND t2.slug = 'code'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'tool_of', 0.83
  FROM tags t1, tags t2
  WHERE t1.slug = 'general-ide' AND t2.slug = 'code'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.78
  FROM tags t1, tags t2
  WHERE t1.slug = 'vs-code' AND t2.slug = 'general-ide'
  ON CONFLICT DO NOTHING;

  -- Design patterns and UX
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'technique_of', 0.88
  FROM tags t1, tags t2
  WHERE t1.slug = 'design-patterns' AND t2.slug = 'code'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.80
  FROM tags t1, tags t2
  WHERE t1.slug = 'ux' AND t2.slug = 'design-patterns'
  ON CONFLICT DO NOTHING;

  -- Languages
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'part_of', 0.91
  FROM tags t1, tags t2
  WHERE t1.slug = 'code-languages' AND t2.slug = 'code'
  ON CONFLICT DO NOTHING;

  -- NoCode platforms
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.70
  FROM tags t1, tags t2
  WHERE t1.slug = 'nocode-platforms' AND t2.slug = 'code'
  ON CONFLICT DO NOTHING;

  -- ===========================================
  -- WEB DEVELOPMENT RELATIONSHIPS
  -- ===========================================

  -- Frontend and styling
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.92
  FROM tags t1, tags t2
  WHERE t1.slug = 'frontend-frameworks' AND t2.slug = 'styling'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'part_of', 0.89
  FROM tags t1, tags t2
  WHERE t1.slug = 'frontend-frameworks' AND t2.slug = 'web-development'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'part_of', 0.87
  FROM tags t1, tags t2
  WHERE t1.slug = 'styling' AND t2.slug = 'web-development'
  ON CONFLICT DO NOTHING;

  -- Backend
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'part_of', 0.90
  FROM tags t1, tags t2
  WHERE t1.slug = 'backend-languages' AND t2.slug = 'web-development'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'part_of', 0.91
  FROM tags t1, tags t2
  WHERE t1.slug = 'databases' AND t2.slug = 'web-development'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'part_of', 0.86
  FROM tags t1, tags t2
  WHERE t1.slug = 'apis' AND t2.slug = 'web-development'
  ON CONFLICT DO NOTHING;

  -- DevOps and performance
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'part_of', 0.85
  FROM tags t1, tags t2
  WHERE t1.slug = 'devops' AND t2.slug = 'web-development'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'technique_of', 0.83
  FROM tags t1, tags t2
  WHERE t1.slug = 'performance-optimization' AND t2.slug = 'web-development'
  ON CONFLICT DO NOTHING;

  -- Security
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'part_of', 0.88
  FROM tags t1, tags t2
  WHERE t1.slug = 'web-security' AND t2.slug = 'web-development'
  ON CONFLICT DO NOTHING;

  -- ===========================================
  -- METAVERSE RELATIONSHIPS
  -- ===========================================

  -- Platforms
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'part_of', 0.90
  FROM tags t1, tags t2
  WHERE t1.slug = 'decentraland' AND t2.slug = 'metaverse-platforms'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'part_of', 0.89
  FROM tags t1, tags t2
  WHERE t1.slug = 'hyperfy' AND t2.slug = 'metaverse-platforms'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'part_of', 0.91
  FROM tags t1, tags t2
  WHERE t1.slug = 'metaverse-platforms' AND t2.slug = 'metaverse'
  ON CONFLICT DO NOTHING;

  -- VR/AR to metaverse
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.86
  FROM tags t1, tags t2
  WHERE t1.slug = 'augmented-reality' AND t2.slug = 'virtual-reality'
  ON CONFLICT DO NOTHING;

  -- Social VR
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'part_of', 0.87
  FROM tags t1, tags t2
  WHERE t1.slug = 'social-vr' AND t2.slug = 'metaverse'
  ON CONFLICT DO NOTHING;

  -- Portals
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'part_of', 0.82
  FROM tags t1, tags t2
  WHERE t1.slug = 'portals' AND t2.slug = 'metaverse'
  ON CONFLICT DO NOTHING;

  -- ===========================================
  -- CROSS-DOMAIN RELATIONSHIPS
  -- ===========================================

  -- AI + 3D
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.85
  FROM tags t1, tags t2
  WHERE t1.slug = 'ai-3d-models' AND t2.slug = 'generative-design'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.79
  FROM tags t1, tags t2
  WHERE t1.slug = 'ai-3d-models' AND t2.slug = 'modeling-tools'
  ON CONFLICT DO NOTHING;

  -- AI + Web
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'part_of', 0.87
  FROM tags t1, tags t2
  WHERE t1.slug = 'ai-integrations' AND t2.slug = 'web-development'
  ON CONFLICT DO NOTHING;

  -- Code + Web
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.83
  FROM tags t1, tags t2
  WHERE t1.slug = 'code-languages' AND t2.slug = 'backend-languages'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.81
  FROM tags t1, tags t2
  WHERE t1.slug = 'code-languages' AND t2.slug = 'frontend-frameworks'
  ON CONFLICT DO NOTHING;

  -- Computer Vision + AR
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.85
  FROM tags t1, tags t2
  WHERE t1.slug = 'computer-vision' AND t2.slug = 'augmented-reality'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.82
  FROM tags t1, tags t2
  WHERE t1.slug = 'computer-vision' AND t2.slug = 'depth-scanning'
  ON CONFLICT DO NOTHING;

  -- ===========================================
  -- ETHICS & SOCIETY
  -- ===========================================

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'part_of', 0.92
  FROM tags t1, tags t2
  WHERE t1.slug = 'ai-ethics' AND t2.slug = 'ethics-society'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.88
  FROM tags t1, tags t2
  WHERE t1.slug = 'ai-ethics' AND t2.slug = 'ai'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'part_of', 0.89
  FROM tags t1, tags t2
  WHERE t1.slug = 'misinformation' AND t2.slug = 'ethics-society'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.78
  FROM tags t1, tags t2
  WHERE t1.slug = 'misinformation' AND t2.slug = 'ai'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'part_of', 0.90
  FROM tags t1, tags t2
  WHERE t1.slug = 'tech-labor' AND t2.slug = 'ethics-society'
  ON CONFLICT DO NOTHING;

  -- ===========================================
  -- MISCELLANEOUS TECH RELATIONSHIPS
  -- ===========================================

  -- Medicine AI
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.87
  FROM tags t1, tags t2
  WHERE t1.slug = 'medicine-ai' AND t2.slug = 'ai'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.82
  FROM tags t1, tags t2
  WHERE t1.slug = 'medicine-ai' AND t2.slug = 'machine-learning'
  ON CONFLICT DO NOTHING;

  -- IoT and Edge Computing
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.88
  FROM tags t1, tags t2
  WHERE t1.slug = 'iot' AND t2.slug = 'edge-computing'
  ON CONFLICT DO NOTHING;

  -- Robotics relationships
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.84
  FROM tags t1, tags t2
  WHERE t1.slug = 'robotics' AND t2.slug = 'ai'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.86
  FROM tags t1, tags t2
  WHERE t1.slug = 'robotics' AND t2.slug = 'computer-vision'
  ON CONFLICT DO NOTHING;

  -- Quantum Computing
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.78
  FROM tags t1, tags t2
  WHERE t1.slug = 'quantum-computing' AND t2.slug = 'machine-learning'
  ON CONFLICT DO NOTHING;

  -- Web3 and Metaverse
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.85
  FROM tags t1, tags t2
  WHERE t1.slug = 'web3' AND t2.slug = 'metaverse'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.83
  FROM tags t1, tags t2
  WHERE t1.slug = 'web3' AND t2.slug = 'decentraland'
  ON CONFLICT DO NOTHING;

  -- Security relationships
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.89
  FROM tags t1, tags t2
  WHERE t1.slug = 'security-cyber' AND t2.slug = 'web-security'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.86
  FROM tags t1, tags t2
  WHERE t1.slug = 'law-data-privacy' AND t2.slug = 'security-cyber'
  ON CONFLICT DO NOTHING;

  -- ===========================================
  -- MODIFIER RELATIONSHIPS
  -- ===========================================

  -- Tools modifier relationships
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, modifiers_tools_id, 'related', 0.70
  FROM tags t1
  WHERE t1.slug IN ('vs-code', 'pycharm-jetbrains', 'blender', 'unity', 'tensorflow-pytorch')
  ON CONFLICT DO NOTHING;

  -- Learning modifier relationships
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, modifiers_learning_id, 'related', 0.68
  FROM tags t1
  WHERE t1.slug IN ('intros', 'jupyter-notebooks', 'resources-general')
  ON CONFLICT DO NOTHING;

  -- Security modifier relationships
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, modifiers_security_id, 'related', 0.75
  FROM tags t1
  WHERE t1.slug IN ('web-security', 'security-cyber', 'law-data-privacy')
  ON CONFLICT DO NOTHING;

  -- Ethics modifier relationships
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, modifiers_ethics_id, 'related', 0.80
  FROM tags t1
  WHERE t1.slug IN ('ai-ethics', 'ethics-society')
  ON CONFLICT DO NOTHING;

  -- Datasets modifier relationships
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, modifiers_datasets_id, 'related', 0.72
  FROM tags t1
  WHERE t1.slug IN ('machine-learning', 'hugging-face', 'computer-vision')
  ON CONFLICT DO NOTHING;

  -- ===========================================
  -- GENERAL & INTERDISCIPLINARY
  -- ===========================================

  -- AI Adjacencies
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'part_of', 0.84
  FROM tags t1, tags t2
  WHERE t1.slug = 'ai-adjacencies' AND t2.slug = 'interdisciplinary-impacts'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.83
  FROM tags t1, tags t2
  WHERE t1.slug = 'ai-adjacencies' AND t2.slug = 'ai'
  ON CONFLICT DO NOTHING;

  -- Code Ecosystem
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'part_of', 0.82
  FROM tags t1, tags t2
  WHERE t1.slug = 'code-ecosystem' AND t2.slug = 'interdisciplinary-impacts'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.80
  FROM tags t1, tags t2
  WHERE t1.slug = 'code-ecosystem' AND t2.slug = 'code'
  ON CONFLICT DO NOTHING;

  -- Media Processing
  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'part_of', 0.81
  FROM tags t1, tags t2
  WHERE t1.slug = 'media-processing' AND t2.slug = 'interdisciplinary-impacts'
  ON CONFLICT DO NOTHING;

  INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
  SELECT t1.id, t2.id, 'related', 0.77
  FROM tags t1, tags t2
  WHERE t1.slug = 'media-processing' AND t2.slug = 'computer-vision'
  ON CONFLICT DO NOTHING;

  -- Count inserted relationships
  SELECT COUNT(*) INTO v_count FROM tag_relationships;

  RAISE NOTICE 'Successfully added comprehensive relationships. Total relationships: %', v_count;
END $$;
