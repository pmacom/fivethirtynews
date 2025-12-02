-- Seed initial high-value tag relationships
-- These relationships establish strong semantic connections between related tags
-- Following SKOS principles and community standards

DO $$
DECLARE
  -- Helper variables for tag IDs
  tag_blender UUID;
  tag_3d_dev UUID;
  tag_godot UUID;
  tag_unity UUID;
  tag_unreal UUID;
  tag_playcanvas UUID;
  tag_threejs UUID;
  tag_animation UUID;
  tag_shaders UUID;
  tag_modeling_tools UUID;
  tag_tools UUID;
  tag_learning UUID;
  tag_workflows UUID;
  tag_ai UUID;
  tag_llm UUID;
  tag_machine_learning UUID;
  tag_computer_vision UUID;
  tag_nlp UUID;
  tag_tensorflow UUID;
  tag_huggingface UUID;
  tag_langchain UUID;
  tag_ai_art UUID;
  tag_ai_video UUID;
  tag_ai_audio UUID;
  tag_ai_3d_models UUID;
  tag_web_dev UUID;
  tag_frontend UUID;
  tag_backend UUID;
  tag_fullstack UUID;
  tag_apis UUID;
  tag_databases UUID;
  tag_devops UUID;
  tag_webgpu UUID;
  tag_ai_integrations UUID;
  tag_code UUID;
  tag_vscode UUID;
  tag_pycharm UUID;
  tag_jupyter UUID;
  tag_general_ide UUID;
  tag_metaverse UUID;
  tag_vr UUID;
  tag_ar UUID;
  tag_social_vr UUID;
  tag_showcase UUID;
  tag_applications UUID;
  tag_integrations UUID;
  tag_communities UUID;
BEGIN
  -- Fetch tag IDs (only proceeding if they exist)
  SELECT id INTO tag_blender FROM tags WHERE slug = 'blender';
  SELECT id INTO tag_3d_dev FROM tags WHERE slug = '3d-development';
  SELECT id INTO tag_godot FROM tags WHERE slug = 'godot';
  SELECT id INTO tag_unity FROM tags WHERE slug = 'unity';
  SELECT id INTO tag_unreal FROM tags WHERE slug = 'unreal-engine';
  SELECT id INTO tag_playcanvas FROM tags WHERE slug = 'playcanvas';
  SELECT id INTO tag_threejs FROM tags WHERE slug = 'three-js';
  SELECT id INTO tag_animation FROM tags WHERE slug = 'animation';
  SELECT id INTO tag_shaders FROM tags WHERE slug = 'shaders';
  SELECT id INTO tag_modeling_tools FROM tags WHERE slug = 'modeling-tools';
  SELECT id INTO tag_tools FROM tags WHERE slug = 'tools';
  SELECT id INTO tag_learning FROM tags WHERE slug = 'learning';
  SELECT id INTO tag_workflows FROM tags WHERE slug = 'workflows';
  SELECT id INTO tag_ai FROM tags WHERE slug = 'ai';
  SELECT id INTO tag_llm FROM tags WHERE slug = 'llm';
  SELECT id INTO tag_machine_learning FROM tags WHERE slug = 'machine-learning';
  SELECT id INTO tag_computer_vision FROM tags WHERE slug = 'computer-vision';
  SELECT id INTO tag_nlp FROM tags WHERE slug = 'nlp';
  SELECT id INTO tag_tensorflow FROM tags WHERE slug = 'tensorflow-pytorch';
  SELECT id INTO tag_huggingface FROM tags WHERE slug = 'hugging-face';
  SELECT id INTO tag_langchain FROM tags WHERE slug = 'langchain';
  SELECT id INTO tag_ai_art FROM tags WHERE slug = 'ai-art';
  SELECT id INTO tag_ai_video FROM tags WHERE slug = 'ai-video';
  SELECT id INTO tag_ai_audio FROM tags WHERE slug = 'ai-audio';
  SELECT id INTO tag_ai_3d_models FROM tags WHERE slug = 'ai-3d-models';
  SELECT id INTO tag_web_dev FROM tags WHERE slug = 'web-development';
  SELECT id INTO tag_frontend FROM tags WHERE slug = 'frontend-frameworks';
  SELECT id INTO tag_backend FROM tags WHERE slug = 'backend-languages';
  SELECT id INTO tag_fullstack FROM tags WHERE slug = 'full-stack';
  SELECT id INTO tag_apis FROM tags WHERE slug = 'apis';
  SELECT id INTO tag_databases FROM tags WHERE slug = 'databases';
  SELECT id INTO tag_devops FROM tags WHERE slug = 'devops';
  SELECT id INTO tag_webgpu FROM tags WHERE slug = 'webgpu';
  SELECT id INTO tag_ai_integrations FROM tags WHERE slug = 'ai-integrations';
  SELECT id INTO tag_code FROM tags WHERE slug = 'code';
  SELECT id INTO tag_vscode FROM tags WHERE slug = 'vs-code';
  SELECT id INTO tag_pycharm FROM tags WHERE slug = 'pycharm-jetbrains';
  SELECT id INTO tag_jupyter FROM tags WHERE slug = 'jupyter-notebooks';
  SELECT id INTO tag_general_ide FROM tags WHERE slug = 'general-ide';
  SELECT id INTO tag_metaverse FROM tags WHERE slug = 'metaverse';
  SELECT id INTO tag_vr FROM tags WHERE slug = 'virtual-reality';
  SELECT id INTO tag_ar FROM tags WHERE slug = 'augmented-reality';
  SELECT id INTO tag_social_vr FROM tags WHERE slug = 'social-vr';
  SELECT id INTO tag_showcase FROM tags WHERE slug = 'showcase';
  SELECT id INTO tag_applications FROM tags WHERE slug = 'applications';
  SELECT id INTO tag_integrations FROM tags WHERE slug = 'integrations';
  SELECT id INTO tag_communities FROM tags WHERE slug = 'communities';

  -- ========================================
  -- 3D Development Relationships
  -- ========================================

  -- Blender relationships (very strong tool_of 3D)
  IF tag_blender IS NOT NULL AND tag_3d_dev IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_blender, tag_3d_dev, 'tool_of', 0.95);
  END IF;

  IF tag_blender IS NOT NULL AND tag_tools IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_blender, tag_tools, 'related', 0.85);
  END IF;

  IF tag_blender IS NOT NULL AND tag_animation IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_blender, tag_animation, 'related', 0.80);
  END IF;

  IF tag_blender IS NOT NULL AND tag_modeling_tools IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_blender, tag_modeling_tools, 'related', 0.90);
  END IF;

  -- Game engine relationships
  IF tag_godot IS NOT NULL AND tag_3d_dev IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_godot, tag_3d_dev, 'tool_of', 0.92);
  END IF;

  IF tag_unity IS NOT NULL AND tag_3d_dev IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_unity, tag_3d_dev, 'tool_of', 0.93);
  END IF;

  IF tag_unreal IS NOT NULL AND tag_3d_dev IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_unreal, tag_3d_dev, 'tool_of', 0.94);
  END IF;

  -- Web-based 3D
  IF tag_threejs IS NOT NULL AND tag_3d_dev IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_threejs, tag_3d_dev, 'tool_of', 0.88);
  END IF;

  IF tag_threejs IS NOT NULL AND tag_web_dev IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_threejs, tag_web_dev, 'related', 0.82);
  END IF;

  IF tag_playcanvas IS NOT NULL AND tag_3d_dev IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_playcanvas, tag_3d_dev, 'tool_of', 0.85);
  END IF;

  IF tag_playcanvas IS NOT NULL AND tag_web_dev IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_playcanvas, tag_web_dev, 'related', 0.80);
  END IF;

  -- Animation and Shaders
  IF tag_animation IS NOT NULL AND tag_3d_dev IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_animation, tag_3d_dev, 'technique_of', 0.90);
  END IF;

  IF tag_shaders IS NOT NULL AND tag_3d_dev IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_shaders, tag_3d_dev, 'technique_of', 0.88);
  END IF;

  -- ========================================
  -- AI Relationships
  -- ========================================

  -- LLM frameworks
  IF tag_langchain IS NOT NULL AND tag_llm IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_langchain, tag_llm, 'tool_of', 0.92);
  END IF;

  IF tag_huggingface IS NOT NULL AND tag_llm IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_huggingface, tag_llm, 'tool_of', 0.90);
  END IF;

  IF tag_huggingface IS NOT NULL AND tag_ai IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_huggingface, tag_ai, 'tool_of', 0.88);
  END IF;

  -- ML frameworks
  IF tag_tensorflow IS NOT NULL AND tag_machine_learning IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_tensorflow, tag_machine_learning, 'tool_of', 0.93);
  END IF;

  IF tag_tensorflow IS NOT NULL AND tag_ai IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_tensorflow, tag_ai, 'tool_of', 0.90);
  END IF;

  -- AI sub-domains
  IF tag_computer_vision IS NOT NULL AND tag_ai IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_computer_vision, tag_ai, 'part_of', 0.92);
  END IF;

  IF tag_nlp IS NOT NULL AND tag_ai IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_nlp, tag_ai, 'part_of', 0.91);
  END IF;

  IF tag_llm IS NOT NULL AND tag_nlp IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_llm, tag_nlp, 'related', 0.85);
  END IF;

  -- AI creative tools
  IF tag_ai_art IS NOT NULL AND tag_ai IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_ai_art, tag_ai, 'part_of', 0.88);
  END IF;

  IF tag_ai_video IS NOT NULL AND tag_ai IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_ai_video, tag_ai, 'part_of', 0.87);
  END IF;

  IF tag_ai_audio IS NOT NULL AND tag_ai IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_ai_audio, tag_ai, 'part_of', 0.86);
  END IF;

  -- AI + 3D crossover
  IF tag_ai_3d_models IS NOT NULL AND tag_ai IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_ai_3d_models, tag_ai, 'part_of', 0.89);
  END IF;

  IF tag_ai_3d_models IS NOT NULL AND tag_3d_dev IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_ai_3d_models, tag_3d_dev, 'related', 0.82);
  END IF;

  -- ========================================
  -- Web Development Relationships
  -- ========================================

  -- Full-stack relationships
  IF tag_fullstack IS NOT NULL AND tag_frontend IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_fullstack, tag_frontend, 'related', 0.90);
  END IF;

  IF tag_fullstack IS NOT NULL AND tag_backend IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_fullstack, tag_backend, 'related', 0.90);
  END IF;

  IF tag_fullstack IS NOT NULL AND tag_databases IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_fullstack, tag_databases, 'related', 0.75);
  END IF;

  -- APIs and backend
  IF tag_apis IS NOT NULL AND tag_backend IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_apis, tag_backend, 'related', 0.85);
  END IF;

  IF tag_databases IS NOT NULL AND tag_backend IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_databases, tag_backend, 'related', 0.88);
  END IF;

  -- DevOps and web
  IF tag_devops IS NOT NULL AND tag_web_dev IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_devops, tag_web_dev, 'related', 0.80);
  END IF;

  -- WebGPU crossover
  IF tag_webgpu IS NOT NULL AND tag_web_dev IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_webgpu, tag_web_dev, 'tool_of', 0.83);
  END IF;

  IF tag_webgpu IS NOT NULL AND tag_3d_dev IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_webgpu, tag_3d_dev, 'related', 0.78);
  END IF;

  -- AI integrations in web
  IF tag_ai_integrations IS NOT NULL AND tag_web_dev IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_ai_integrations, tag_web_dev, 'related', 0.82);
  END IF;

  IF tag_ai_integrations IS NOT NULL AND tag_ai IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_ai_integrations, tag_ai, 'related', 0.85);
  END IF;

  -- ========================================
  -- Code/IDE Relationships
  -- ========================================

  IF tag_vscode IS NOT NULL AND tag_code IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_vscode, tag_code, 'tool_of', 0.92);
  END IF;

  IF tag_pycharm IS NOT NULL AND tag_code IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_pycharm, tag_code, 'tool_of', 0.88);
  END IF;

  IF tag_jupyter IS NOT NULL AND tag_code IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_jupyter, tag_code, 'tool_of', 0.85);
  END IF;

  IF tag_jupyter IS NOT NULL AND tag_machine_learning IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_jupyter, tag_machine_learning, 'related', 0.80);
  END IF;

  -- ========================================
  -- Metaverse Relationships
  -- ========================================

  IF tag_vr IS NOT NULL AND tag_metaverse IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_vr, tag_metaverse, 'part_of', 0.92);
  END IF;

  IF tag_ar IS NOT NULL AND tag_metaverse IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_ar, tag_metaverse, 'part_of', 0.88);
  END IF;

  IF tag_social_vr IS NOT NULL AND tag_vr IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_social_vr, tag_vr, 'related', 0.85);
  END IF;

  IF tag_vr IS NOT NULL AND tag_3d_dev IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_vr, tag_3d_dev, 'related', 0.78);
  END IF;

  -- ========================================
  -- Cross-cutting Modifier Relationships
  -- ========================================

  -- Tools modifier applies broadly
  IF tag_tools IS NOT NULL AND tag_learning IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_tools, tag_learning, 'related', 0.65);
  END IF;

  -- Workflows common with tools
  IF tag_workflows IS NOT NULL AND tag_tools IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_workflows, tag_tools, 'related', 0.72);
  END IF;

  -- Showcase and applications
  IF tag_showcase IS NOT NULL AND tag_applications IS NOT NULL THEN
    INSERT INTO tag_relationships (tag_id_1, tag_id_2, relationship_type, strength)
    VALUES (tag_showcase, tag_applications, 'related', 0.70);
  END IF;

  RAISE NOTICE 'Successfully seeded tag relationships';
END $$;
