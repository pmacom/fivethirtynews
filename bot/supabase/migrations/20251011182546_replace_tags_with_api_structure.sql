-- Add slug column to tags table for API compatibility
ALTER TABLE tags ADD COLUMN IF NOT EXISTS slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);

-- Clear existing tags to start fresh
TRUNCATE tags CASCADE;

-- First, create the root category tags that are referenced as parents
INSERT INTO tags (slug, name, description, parent_id, is_system) VALUES
  ('general', 'General', 'General tech content and resources', NULL, true),
  ('3d-development', '3D Development', '3D graphics, modeling, and game engines', NULL, true),
  ('ai', 'Artificial Intelligence', 'AI, machine learning, and related technologies', NULL, true),
  ('web-development', 'Web Development', 'Frontend, backend, and full-stack development', NULL, true),
  ('code', 'Code', 'Programming languages, tools, and environments', NULL, true),
  ('misc', 'Miscellaneous', 'Science, law, security, and other topics', NULL, true),
  ('offtopic', 'Off Topic', 'Non-technical discussions and culture', NULL, true),
  ('metaverse', 'Metaverse', 'Virtual reality, AR, and metaverse platforms', NULL, true),
  ('interdisciplinary-impacts', 'Interdisciplinary Impacts', 'Cross-cutting technological impacts', NULL, true),
  ('ethics-society', 'Ethics & Society', 'Ethical considerations and societal impacts', NULL, true),
  ('modifiers', 'Modifiers', 'Cross-cutting attributes and aspects', NULL, true);

-- Insert new tag structure from API
DO $$
DECLARE
  tag_data JSONB := '[
    {"tag": "intros", "human_readable": "Introductions", "description": "Basic overviews and introductory content for various topics.", "parent": "general"},
    {"tag": "jobhunt", "human_readable": "Job Hunt", "description": "Resources and news related to job searching in tech fields.", "parent": "general"},
    {"tag": "resources-general", "human_readable": "General Resources", "description": "Broad tools, datasets, and support materials across technologies.", "parent": "general"},
    {"tag": "physical-experiences", "human_readable": "Physical Experiences", "description": "News on real-world tech interactions and experiences.", "parent": "general"},
    {"tag": "preshow", "human_readable": "Preshow", "description": "Pre-event or preparatory content for tech showcases.", "parent": "general"},
    {"tag": "blender", "human_readable": "Blender", "description": "Open-source 3D creation suite.", "parent": "3d-development"},
    {"tag": "godot", "human_readable": "Godot", "description": "Free and open-source game engine.", "parent": "3d-development"},
    {"tag": "playcanvas", "human_readable": "Playcanvas", "description": "Web-based 3D game engine.", "parent": "3d-development"},
    {"tag": "gaussian-splatting", "human_readable": "Gaussian Splatting", "description": "Technique for 3D scene representation and rendering.", "parent": "3d-development"},
    {"tag": "three-js", "human_readable": "Three.js", "description": "JavaScript library for 3D graphics in the browser.", "parent": "3d-development"},
    {"tag": "unity", "human_readable": "Unity", "description": "Cross-platform game engine.", "parent": "3d-development"},
    {"tag": "unreal-engine", "human_readable": "Unreal Engine", "description": "Real-time 3D creation engine.", "parent": "3d-development"},
    {"tag": "shaders", "human_readable": "Shaders", "description": "Programs for rendering effects in 3D graphics.", "parent": "3d-development"},
    {"tag": "generative-design", "human_readable": "Generative Design", "description": "AI-driven design optimization and prototyping.", "parent": "3d-development"},
    {"tag": "modeling-tools", "human_readable": "Modeling Tools", "description": "Software like Maya or ZBrush for 3D modeling.", "parent": "3d-development"},
    {"tag": "animation", "human_readable": "Animation", "description": "Rigging and motion capture techniques.", "parent": "3d-development"},
    {"tag": "depth-scanning", "human_readable": "Depth & Scanning", "description": "Photogrammetry and LiDAR for 3D scanning.", "parent": "3d-development"},
    {"tag": "ai-3d-models", "human_readable": "AI 3D Models", "description": "AI-generated or reconstructed 3D models.", "parent": "ai"},
    {"tag": "ai-art", "human_readable": "AI Art", "description": "AI tools for image generation and style transfer.", "parent": "ai"},
    {"tag": "ai-audio", "human_readable": "AI Audio", "description": "AI for audio synthesis, music, and processing.", "parent": "ai"},
    {"tag": "llm", "human_readable": "Large Language Models", "description": "Advanced text-based AI models and fine-tuning.", "parent": "ai"},
    {"tag": "ai-showcase", "human_readable": "AI Showcase", "description": "Demonstrations and examples of AI applications.", "parent": "ai"},
    {"tag": "ai-video", "human_readable": "AI Video", "description": "AI for video generation and editing.", "parent": "ai"},
    {"tag": "ai-workflows", "human_readable": "AI Workflows", "description": "Automation and integration pipelines in AI.", "parent": "ai"},
    {"tag": "general-ai", "human_readable": "General AI", "description": "Broad AI topics, ethics, and regulations.", "parent": "ai"},
    {"tag": "machine-learning", "human_readable": "Machine Learning", "description": "Supervised, unsupervised, and reinforcement learning.", "parent": "ai"},
    {"tag": "computer-vision", "human_readable": "Computer Vision", "description": "Object detection, segmentation, and depth estimation.", "parent": "ai"},
    {"tag": "nlp", "human_readable": "Natural Language Processing", "description": "Translation, sentiment analysis, and text processing.", "parent": "ai"},
    {"tag": "tensorflow-pytorch", "human_readable": "TensorFlow/PyTorch", "description": "Popular ML frameworks for model building.", "parent": "ai"},
    {"tag": "hugging-face", "human_readable": "Hugging Face", "description": "Libraries and models for AI development.", "parent": "ai"},
    {"tag": "langchain", "human_readable": "LangChain", "description": "Framework for LLM orchestration and chaining.", "parent": "ai"},
    {"tag": "open-source-models", "human_readable": "Open-Source Models", "description": "Community-driven AI models like Llama or Mistral.", "parent": "ai"},
    {"tag": "frontend-frameworks", "human_readable": "Frontend Frameworks", "description": "Tools like React, Vue for web interfaces.", "parent": "web-development"},
    {"tag": "styling", "human_readable": "Styling", "description": "CSS and frameworks like Tailwind for web design.", "parent": "web-development"},
    {"tag": "backend-languages", "human_readable": "Backend Languages", "description": "Server-side tech like Node.js or Django.", "parent": "web-development"},
    {"tag": "databases", "human_readable": "Databases", "description": "SQL/NoSQL storage solutions like MongoDB.", "parent": "web-development"},
    {"tag": "full-stack", "human_readable": "Full-Stack", "description": "Integrated stacks like MERN or JAMstack.", "parent": "web-development"},
    {"tag": "performance-optimization", "human_readable": "Performance Optimization", "description": "Techniques for faster web apps, SEO, and accessibility.", "parent": "web-development"},
    {"tag": "web-security", "human_readable": "Web Security", "description": "Authentication and vulnerability protection.", "parent": "web-development"},
    {"tag": "apis", "human_readable": "APIs", "description": "REST, GraphQL, and real-time web services.", "parent": "web-development"},
    {"tag": "devops", "human_readable": "DevOps", "description": "CI/CD pipelines and cloud deployments.", "parent": "web-development"},
    {"tag": "webgpu", "human_readable": "WebGPU", "description": "API for advanced web graphics and rendering.", "parent": "web-development"},
    {"tag": "ai-integrations", "human_readable": "AI Integrations", "description": "Embedding AI in web applications.", "parent": "web-development"},
    {"tag": "code-languages", "human_readable": "Code Languages", "description": "Programming languages like Python or JavaScript.", "parent": "code"},
    {"tag": "nocode-platforms", "human_readable": "NoCode Platforms", "description": "Visual development tools like Bubble.", "parent": "code"},
    {"tag": "design-patterns", "human_readable": "Design Patterns", "description": "UI/UX design principles and prototyping.", "parent": "code"},
    {"tag": "ux", "human_readable": "User Experience", "description": "User testing and behavioral design.", "parent": "code"},
    {"tag": "vs-code", "human_readable": "VS Code", "description": "Popular code editor with extensions.", "parent": "code"},
    {"tag": "pycharm-jetbrains", "human_readable": "PyCharm/JetBrains", "description": "IDEs for Python and other languages.", "parent": "code"},
    {"tag": "jupyter-notebooks", "human_readable": "Jupyter Notebooks", "description": "Interactive computing environment.", "parent": "code"},
    {"tag": "eclipse-android-studio", "human_readable": "Eclipse/Android Studio", "description": "IDEs for Java and Android development.", "parent": "code"},
    {"tag": "general-ide", "human_readable": "General IDE", "description": "Broad updates across integrated development environments.", "parent": "code"},
    {"tag": "science-general", "human_readable": "General Science", "description": "Broad scientific topics and advancements.", "parent": "misc"},
    {"tag": "science-physics", "human_readable": "Physics", "description": "Physics-related news and quantum topics.", "parent": "misc"},
    {"tag": "science-biology", "human_readable": "Biology/Biotech", "description": "Biological sciences and biotechnology.", "parent": "misc"},
    {"tag": "quantum-computing", "human_readable": "Quantum Computing", "description": "Quantum algorithms and hardware.", "parent": "misc"},
    {"tag": "law-general", "human_readable": "General Law", "description": "Legal aspects in tech.", "parent": "misc"},
    {"tag": "law-ip-rights", "human_readable": "IP Rights", "description": "Intellectual property laws.", "parent": "misc"},
    {"tag": "law-data-privacy", "human_readable": "Data Privacy", "description": "Privacy regulations like GDPR.", "parent": "misc"},
    {"tag": "robotics", "human_readable": "Robotics", "description": "Autonomous systems and drones.", "parent": "misc"},
    {"tag": "medicine-ai", "human_readable": "AI in Medicine", "description": "AI applications in healthcare and biotech.", "parent": "misc"},
    {"tag": "security-general", "human_readable": "General Security", "description": "Broad security concerns.", "parent": "misc"},
    {"tag": "security-cyber", "human_readable": "Cybersecurity", "description": "Threats and encryption methods.", "parent": "misc"},
    {"tag": "energy-renewables", "human_readable": "Renewable Energy", "description": "Sustainable energy sources and innovations.", "parent": "misc"},
    {"tag": "web3", "human_readable": "Web3", "description": "Decentralized tech, blockchain, and NFTs.", "parent": "misc"},
    {"tag": "environment-climate", "human_readable": "Climate & Environment", "description": "Sustainability and climate tech.", "parent": "misc"},
    {"tag": "edge-computing", "human_readable": "Edge Computing", "description": "Real-time processing at the network edge.", "parent": "misc"},
    {"tag": "iot", "human_readable": "IoT", "description": "Internet of Things devices and applications.", "parent": "misc"},
    {"tag": "sense-philosophy", "human_readable": "Philosophy & Sense", "description": "Philosophical discussions and mindfulness.", "parent": "offtopic"},
    {"tag": "nonsense-memes", "human_readable": "Memes & Nonsense", "description": "Humor and light-hearted content.", "parent": "offtopic"},
    {"tag": "society-culture", "human_readable": "Society & Culture", "description": "Cultural and societal topics.", "parent": "offtopic"},
    {"tag": "decentraland", "human_readable": "Decentraland", "description": "Blockchain-based virtual world.", "parent": "metaverse"},
    {"tag": "hyperfy", "human_readable": "Hyperfy", "description": "Metaverse platform for virtual spaces.", "parent": "metaverse"},
    {"tag": "metaverse-platforms", "human_readable": "Metaverse Platforms", "description": "General metaverse economies and interoperability.", "parent": "metaverse"},
    {"tag": "portals", "human_readable": "Portals", "description": "Entry points and gateways in virtual worlds.", "parent": "metaverse"},
    {"tag": "virtual-reality", "human_readable": "Virtual Reality", "description": "VR headsets and integrations.", "parent": "metaverse"},
    {"tag": "augmented-reality", "human_readable": "Augmented Reality", "description": "AR tools and applications like ARKit.", "parent": "metaverse"},
    {"tag": "social-vr", "human_readable": "Social VR", "description": "Events, avatars, and interactions in VR.", "parent": "metaverse"},
    {"tag": "ai-adjacencies", "human_readable": "AI Adjacencies", "description": "AI impacts in VR, robotics, and security.", "parent": "interdisciplinary-impacts"},
    {"tag": "media-processing", "human_readable": "Media Processing", "description": "Depth detection and audio variations.", "parent": "interdisciplinary-impacts"},
    {"tag": "code-ecosystem", "human_readable": "Code Ecosystem", "description": "Broad updates in coding tools and integrations.", "parent": "interdisciplinary-impacts"},
    {"tag": "ai-ethics", "human_readable": "AI Ethics", "description": "Fairness, bias, and accountability in AI.", "parent": "ethics-society"},
    {"tag": "tech-labor", "human_readable": "Tech & Labor", "description": "Automation impacts on jobs and markets.", "parent": "ethics-society"},
    {"tag": "misinformation", "human_readable": "Misinformation", "description": "Deepfakes and content moderation issues.", "parent": "ethics-society"},
    {"tag": "tools", "human_readable": "Tools", "description": "Libraries, frameworks, and add-ons.", "parent": "modifiers"},
    {"tag": "learning", "human_readable": "Learning", "description": "Tutorials, courses, and tips.", "parent": "modifiers"},
    {"tag": "communities", "human_readable": "Communities", "description": "Forums, events, and resources.", "parent": "modifiers"},
    {"tag": "improvements", "human_readable": "Improvements", "description": "Updates, optimizations, and enhancements.", "parent": "modifiers"},
    {"tag": "integrations", "human_readable": "Integrations", "description": "Cross-technology features and connections.", "parent": "modifiers"},
    {"tag": "applications", "human_readable": "Applications", "description": "Real-world uses and implementations.", "parent": "modifiers"},
    {"tag": "ethics", "human_readable": "Ethics", "description": "Bias, fairness, and moral considerations.", "parent": "modifiers"},
    {"tag": "regulations", "human_readable": "Regulations", "description": "Policies, laws, and standards.", "parent": "modifiers"},
    {"tag": "security", "human_readable": "Security", "description": "Vulnerabilities, privacy, and protections.", "parent": "modifiers"},
    {"tag": "showcase", "human_readable": "Showcase", "description": "Demos and examples.", "parent": "modifiers"},
    {"tag": "workflows", "human_readable": "Workflows", "description": "Pipelines and automation processes.", "parent": "modifiers"},
    {"tag": "datasets", "human_readable": "Datasets", "description": "Data libraries and hardware recommendations.", "parent": "modifiers"}
  ]'::jsonb;
  tag JSONB;
  parent_id_val UUID;
  max_iterations INT := 20;
  inserted_count INT;
  total_inserted INT := 0;
  i INT;
BEGIN
  -- Insert tags in multiple passes until all are inserted
  -- This handles parent-child dependencies regardless of order
  FOR i IN 1..max_iterations LOOP
    inserted_count := 0;

    FOR tag IN SELECT * FROM jsonb_array_elements(tag_data)
    LOOP
      -- Skip if already inserted
      CONTINUE WHEN EXISTS (SELECT 1 FROM tags WHERE slug = tag->>'tag');

      -- Find parent UUID if parent exists in our tags table
      parent_id_val := NULL;
      IF tag->>'parent' IS NOT NULL THEN
        SELECT id INTO parent_id_val FROM tags WHERE slug = tag->>'parent';
      END IF;

      -- Insert tag if parent exists or if it's a root tag
      IF parent_id_val IS NOT NULL OR tag->>'parent' IS NULL OR NOT EXISTS (SELECT 1 FROM jsonb_array_elements(tag_data) t WHERE t->>'tag' = tag->>'parent') THEN
        INSERT INTO tags (slug, name, description, parent_id, is_system)
        VALUES (
          tag->>'tag',
          tag->>'human_readable',
          tag->>'description',
          parent_id_val,
          false
        )
        ON CONFLICT (slug) DO NOTHING;

        inserted_count := inserted_count + 1;
        total_inserted := total_inserted + 1;
      END IF;
    END LOOP;

    -- Exit if no tags were inserted in this pass
    EXIT WHEN inserted_count = 0;
  END LOOP;

  RAISE NOTICE 'Inserted % tags in % passes', total_inserted, i;
END $$;
