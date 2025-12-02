// 530 Background Service Worker

// ===== ENVIRONMENT CONFIGURATION =====
// These values are replaced during build for production
const ENV = {
  API_URL: 'http://localhost:3000/api',
  APP_URL: 'http://localhost:3000',
  IS_DEV: true,
  ENV_NAME: 'development',
  ENV_COLOR: '#8B5CF6',
};

// Log environment with colored badge
const envStyle = `background: ${ENV.ENV_COLOR}; color: white; padding: 2px 6px; border-radius: 3px; font-weight: bold;`;
console.log(`%c530 News (${ENV.ENV_NAME})`, envStyle, `→ ${ENV.API_URL}`);

// API configuration
let apiConfig = {
  baseUrl: ENV.API_URL
};

// Allow storage override for flexibility (useful for testing)
chrome.storage.sync.get(['apiUrl'], (result) => {
  if (result.apiUrl && result.apiUrl !== ENV.API_URL) {
    apiConfig.baseUrl = result.apiUrl;
    console.log('530: API URL overridden from storage:', apiConfig.baseUrl);
  }
});

// Mock storage for development/testing
const mockStorage = {
  tags: []
};

// ===== AUTHENTICATION =====

// Get current auth state from storage
async function getAuthState() {
  const data = await chrome.storage.local.get(['sessionToken', 'user', 'expiresAt']);

  if (!data.sessionToken || !data.user) {
    return { isAuthenticated: false, user: null };
  }

  // Check if session expired
  if (data.expiresAt && Date.now() > data.expiresAt) {
    await clearAuthState();
    return { isAuthenticated: false, user: null };
  }

  return {
    isAuthenticated: true,
    user: data.user,
    sessionToken: data.sessionToken,
    expiresAt: data.expiresAt
  };
}

// Clear auth state (logout)
async function clearAuthState() {
  await chrome.storage.local.remove(['sessionToken', 'user', 'expiresAt']);
  console.log('530: Auth state cleared');
}

// Get auth header for API requests
async function getAuthHeader() {
  const { sessionToken } = await getAuthState();
  if (!sessionToken) return {};
  return { 'Authorization': `Bearer ${sessionToken}` };
}

// Handle Discord OAuth login
async function handleLogin() {
  const authUrl = `${apiConfig.baseUrl}/auth/discord`;

  return new Promise((resolve, reject) => {
    // Open auth URL in a new tab
    chrome.tabs.create({ url: authUrl }, (tab) => {
      const tabId = tab.id;

      // Listen for the tab to navigate to the callback with hash
      const listener = (changedTabId, changeInfo, tabInfo) => {
        if (changedTabId !== tabId) return;

        // Check if URL has our callback with hash
        if (changeInfo.url && changeInfo.url.includes('/api/auth/discord/callback#')) {
          // Remove listener
          chrome.tabs.onUpdated.removeListener(listener);

          try {
            const hashIndex = changeInfo.url.indexOf('#');
            const hash = decodeURIComponent(changeInfo.url.substring(hashIndex + 1));
            const payload = JSON.parse(hash);

            // Close the tab
            chrome.tabs.remove(tabId);

            if (!payload.success) {
              reject(new Error(payload.error || 'Login failed'));
              return;
            }

            // Store auth data
            chrome.storage.local.set({
              sessionToken: payload.token,
              user: payload.user,
              expiresAt: payload.expiresAt
            }).then(() => {
              console.log('530: Login successful:', payload.user.display_name);
              resolve({ isAuthenticated: true, user: payload.user });
            });
          } catch (err) {
            chrome.tabs.remove(tabId);
            console.error('530: Failed to parse callback:', err);
            reject(new Error('Failed to process login response'));
          }
        }
      };

      chrome.tabs.onUpdated.addListener(listener);

      // Also listen for tab close (user cancelled)
      const closeListener = (closedTabId) => {
        if (closedTabId === tabId) {
          chrome.tabs.onUpdated.removeListener(listener);
          chrome.tabs.onRemoved.removeListener(closeListener);
          reject(new Error('Login cancelled'));
        }
      };
      chrome.tabs.onRemoved.addListener(closeListener);
    });
  });
}

// Handle logout
async function handleLogout() {
  await clearAuthState();
  return { success: true };
}

// Verify session with server
async function handleVerifySession() {
  const authState = await getAuthState();

  if (!authState.isAuthenticated) {
    return { valid: false };
  }

  try {
    const response = await fetch(`${apiConfig.baseUrl}/auth/verify`, {
      headers: await getAuthHeader()
    });

    const result = await response.json();

    if (!result.valid) {
      await clearAuthState();
    }

    return result;
  } catch (error) {
    console.error('530: Session verification failed:', error);
    return { valid: false, error: error.message };
  }
}

// ===== NOTES =====

// Get notes for content
async function handleGetNotes(contentId) {
  const authHeaders = await getAuthHeader();

  if (!authHeaders.Authorization) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${apiConfig.baseUrl}/content/${contentId}/notes`, {
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch notes');
  }

  return response.json();
}

// Save user's note for content
async function handleSaveNote(contentId, noteText) {
  const authHeaders = await getAuthHeader();

  if (!authHeaders.Authorization) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${apiConfig.baseUrl}/content/${contentId}/notes`, {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ note_text: noteText })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save note');
  }

  return response.json();
}

// Delete user's note for content
async function handleDeleteNote(contentId) {
  const authHeaders = await getAuthHeader();

  if (!authHeaders.Authorization) {
    throw new Error('Authentication required');
  }

  const response = await fetch(`${apiConfig.baseUrl}/content/${contentId}/notes`, {
    method: 'DELETE',
    headers: authHeaders
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete note');
  }

  return response.json();
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // ===== AUTH HANDLERS =====
  if (request.action === 'getAuthState') {
    getAuthState()
      .then(state => sendResponse({ success: true, data: state }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'login') {
    handleLogin()
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'logout') {
    handleLogout()
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'verifySession') {
    handleVerifySession()
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // ===== NOTES HANDLERS =====
  if (request.action === 'getNotes') {
    handleGetNotes(request.data.contentId)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'saveUserNote') {
    handleSaveNote(request.data.contentId, request.data.noteText)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'deleteUserNote') {
    handleDeleteNote(request.data.contentId)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // ===== CONFIG HANDLERS =====
  if (request.action === 'getConfig') {
    sendResponse({
      success: true,
      data: {
        url: apiConfig.baseUrl,
        configured: !!apiConfig.baseUrl
      }
    });
    return true;
  }

  if (request.action === 'tagPost') {
    handleTagPost(request.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === 'getTags') {
    handleGetTags()
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'getTagHierarchy') {
    handleGetTagHierarchy()
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'checkPostExists') {
    handleCheckPostExists(request.data.tweetId)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'checkContentExists') {
    handleCheckContentExists(request.data.platform, request.data.contentId)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'updatePostTags') {
    handleUpdatePostTags(request.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'updateContentTags') {
    handleUpdateContentTags(request.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'saveComment') {
    handleSaveComment(request.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'updateConfig') {
    handleUpdateConfig(request.data)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'getContentCount') {
    handleGetContentCount()
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'getChannelGroups') {
    handleGetChannelGroups()
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'updateContentChannels') {
    handleUpdateContentChannels(request.data)
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'fetchTags') {
    handleFetchTags()
      .then(response => sendResponse({ success: true, tags: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // ===== USER DATA HANDLERS =====
  if (request.action === 'getUserStats') {
    handleGetUserStats()
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (request.action === 'getRecentPosts') {
    handleGetRecentPosts()
      .then(response => sendResponse({ success: true, data: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Handle tagging a post (legacy - now uses handleUpdatePostTags)
async function handleTagPost(data) {
  console.log('530: Tagging post (redirecting to updatePostTags)', data);
  return await handleUpdatePostTags(data);
}

// Get all tagged posts
async function handleGetTags() {
  if (!apiConfig.baseUrl) {
    console.log('530: No API configured - returning mock storage', mockStorage.tags.length, 'tags');
    return mockStorage.tags;
  }

  try {
    const response = await fetch(`${apiConfig.baseUrl}/posts?limit=100`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    if (result.success && result.data) {
      console.log('530: Retrieved from API', result.data.length, 'posts');
      return result.data;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('530: API fetch failed', error);
    return mockStorage.tags;
  }
}

// Update API configuration
async function handleUpdateConfig(config) {
  apiConfig.baseUrl = config.url;

  await chrome.storage.sync.set({
    apiUrl: config.url
  });

  console.log('530: API config updated');
}

// Generate simple ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Get tag hierarchy from API
async function handleGetTagHierarchy() {
  console.log('530: handleGetTagHierarchy called');
  console.log('530: Current API config:', { url: apiConfig.baseUrl });

  if (!apiConfig.baseUrl) {
    console.warn('530: No API configured - returning mock hierarchy');
    return getMockHierarchy();
  }

  try {
    console.log('530: Fetching tags from', apiConfig.baseUrl);
    const response = await fetch(`${apiConfig.baseUrl}/tags/hierarchy`);

    console.log('530: Response status:', response.status, response.statusText);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('530: Retrieved tag hierarchy from API', result);

    if (result.success && result.data) {
      console.log('530: Root categories:', result.data.length);
      return result.data;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('530: Failed to fetch tag hierarchy', error);
    console.error('530: Error details:', error.message, error.stack);
    return getMockHierarchy();
  }
}


// Check if post exists in database (legacy - for Twitter)
async function handleCheckPostExists(tweetId) {
  if (!apiConfig.baseUrl) {
    return { exists: false, post: null };
  }

  try {
    const response = await fetch(`${apiConfig.baseUrl}/posts/check?tweetId=${tweetId}`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('530: Check post response:', data);
    return data;
  } catch (error) {
    console.error('530: Failed to check post existence', error);
    return { exists: false, post: null };
  }
}

// Check if content exists in database (multi-platform)
async function handleCheckContentExists(platform, contentId) {
  if (!apiConfig.baseUrl) {
    return { exists: false, content: null };
  }

  try {
    const response = await fetch(`${apiConfig.baseUrl}/content/check?platform=${platform}&contentId=${contentId}`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('530: Check content response:', result);

    if (result.success && result.data) {
      return result.data;
    }

    return { exists: false, content: null };
  } catch (error) {
    console.error('530: Failed to check content existence', error);
    return { exists: false, content: null };
  }
}

// Update post tags (legacy - for Twitter)
async function handleUpdatePostTags(data) {
  const { tweetId, tags, tweetText, author, url, thumbnailUrl } = data;

  if (!apiConfig.baseUrl) {
    console.log('530: No API configured - cannot update tags');
    throw new Error('API not configured');
  }

  try {
    const postData = {
      tweetId,
      tags,
      tweetText,
      author,
      url,
      thumbnailUrl
    };

    const response = await fetch(`${apiConfig.baseUrl}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('530: Post tags saved:', result);

    // Track tag co-occurrence for smart suggestions
    if (result.success && tags && tags.length > 1) {
      try {
        await trackTagCoOccurrence(tags);
      } catch (coError) {
        // Don't fail the save if co-occurrence tracking fails
        console.warn('530: Failed to track tag co-occurrence', coError);
      }
    }

    return result.data;
  } catch (error) {
    console.error('530: Failed to update post tags', error);
    throw error;
  }
}

// Update content tags (multi-platform)
async function handleUpdateContentTags(data) {
  const {
    platform,
    platformContentId,
    url,
    tags,
    title,
    description,
    content,
    author,
    authorUsername,
    authorUrl,
    authorAvatarUrl,
    thumbnailUrl,
    mediaAssets,
    metadata,
    contentCreatedAt
  } = data;

  if (!apiConfig.baseUrl) {
    console.log('530: No API configured - cannot update content tags');
    throw new Error('API not configured');
  }

  try {
    const contentData = {
      platform,
      platformContentId,
      url,
      tags,
      title,
      description,
      content,
      author,
      authorUsername,
      authorUrl,
      authorAvatarUrl,
      thumbnailUrl,
      mediaAssets,
      metadata,
      contentCreatedAt
    };

    const response = await fetch(`${apiConfig.baseUrl}/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contentData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('530: Content tags saved:', result);

    // Track tag co-occurrence for smart suggestions
    if (result.success && tags && tags.length > 1) {
      try {
        await trackTagCoOccurrence(tags);
      } catch (coError) {
        // Don't fail the save if co-occurrence tracking fails
        console.warn('530: Failed to track tag co-occurrence', coError);
      }
    }

    return result.data;
  } catch (error) {
    console.error('530: Failed to update content tags', error);
    throw error;
  }
}

// Save comment attached to content
async function handleSaveComment(data) {
  const { contentId, videoData, comment } = data;

  if (!apiConfig.baseUrl) {
    console.log('530: No API configured - cannot save comment');
    throw new Error('API not configured');
  }

  try {
    // First, ensure parent content exists
    // Check if content exists
    const platform = comment.platform;
    const platformContentId = contentId.split(':')[1];

    const checkResponse = await fetch(`${apiConfig.baseUrl}/content/check?platform=${platform}&contentId=${platformContentId}`);
    const checkResult = await checkResponse.json();

    // If parent content doesn't exist, create it
    if (!checkResult.data || !checkResult.data.exists) {
      console.log('530: Parent content does not exist, creating it...');

      // Create minimal content record from videoData
      const contentData = {
        platform: videoData.platform || platform,
        platformContentId: videoData.videoId || platformContentId,
        url: videoData.url,
        title: videoData.title,
        description: videoData.description,
        author: videoData.channelName,
        authorUsername: videoData.channelUsername,
        authorUrl: videoData.channelUrl,
        authorAvatarUrl: videoData.channelAvatar,
        thumbnailUrl: videoData.thumbnailUrl,
        mediaAssets: videoData.mediaAssets,
        contentCreatedAt: videoData.contentCreatedAt,
        metadata: videoData.metadata || {},
        tags: [] // No tags yet, user can add later
      };

      const createResponse = await fetch(`${apiConfig.baseUrl}/content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contentData)
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create parent content');
      }

      console.log('530: Parent content created successfully');
    }

    // Now save the comment
    const commentData = {
      contentId,
      comment: {
        platform: comment.platform,
        platformCommentId: comment.platformCommentId,
        commentText: comment.commentText,
        commentUrl: comment.commentUrl,
        authorName: comment.authorName,
        authorUsername: comment.authorUsername,
        authorAvatarUrl: comment.authorAvatarUrl,
        authorUrl: comment.authorUrl,
        likesCount: comment.likesCount || 0
      }
    };

    const response = await fetch(`${apiConfig.baseUrl}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commentData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('530: Comment saved successfully:', result);
    return result.data;
  } catch (error) {
    console.error('530: Failed to save comment', error);
    throw error;
  }
}

// Get content count from API
async function handleGetContentCount() {
  if (!apiConfig.baseUrl) {
    console.log('530: No API configured - returning mock count');
    return { total: 0, platform: 'all' };
  }

  try {
    const response = await fetch(`${apiConfig.baseUrl}/content/count`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('530: Retrieved content count from API', result);

    if (result.success && result.data) {
      return result.data;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('530: Failed to fetch content count', error);
    return { total: 0, platform: 'all' };
  }
}

// Get channel groups from API
async function handleGetChannelGroups() {
  console.log('530: handleGetChannelGroups called');

  if (!apiConfig.baseUrl) {
    console.warn('530: No API configured - returning mock channel groups');
    return getMockChannelGroups();
  }

  try {
    const response = await fetch(`${apiConfig.baseUrl}/channels`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('530: Retrieved channel groups from API', result);

    if (result.success && result.data) {
      return result.data;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('530: Failed to fetch channel groups', error);
    return getMockChannelGroups();
  }
}

// Fetch available tags for autocomplete
async function handleFetchTags() {
  console.log('530: handleFetchTags called');

  if (!apiConfig.baseUrl) {
    console.warn('530: No API configured - returning empty tags');
    return [];
  }

  try {
    const response = await fetch(`${apiConfig.baseUrl}/tags`);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('530: Retrieved tags from API', result.tags?.length || 0, 'tags');

    if (result.success && result.tags) {
      return result.tags;
    } else {
      throw new Error('Invalid API response format');
    }
  } catch (error) {
    console.error('530: Failed to fetch tags', error);
    return [];
  }
}

// Update content with channels (new channel system)
async function handleUpdateContentChannels(data) {
  const {
    platform,
    platformContentId,
    url,
    channels,
    primaryChannel,
    tags, // NEW: Additional tags
    pendingNote, // NEW: Draft note to save after content creation
    title,
    description,
    content,
    author,
    authorUsername,
    authorUrl,
    authorAvatarUrl,
    thumbnailUrl,
    mediaAssets,
    metadata,
    contentCreatedAt
  } = data;

  if (!apiConfig.baseUrl) {
    console.log('530: No API configured - cannot update content channels');
    throw new Error('API not configured');
  }

  try {
    const contentData = {
      platform,
      platformContentId,
      url,
      channels,
      primaryChannel,
      tags: tags || [], // Include tags in submission
      title,
      description,
      content,
      author,
      authorUsername,
      authorUrl,
      authorAvatarUrl,
      thumbnailUrl,
      mediaAssets,
      metadata,
      contentCreatedAt
    };

    const response = await fetch(`${apiConfig.baseUrl}/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(contentData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('530: Content channels saved:', result);

    // If content saved and there's a pending note, save it
    if (result.success && result.data?.contentId && pendingNote) {
      try {
        const authState = await getAuthState();
        if (authState?.token) {
          const noteResponse = await fetch(`${apiConfig.baseUrl}/content/${result.data.contentId}/notes`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authState.token}`,
            },
            body: JSON.stringify({ note_text: pendingNote }),
          });
          if (noteResponse.ok) {
            console.log('530: Pending note saved with content');
          } else {
            console.warn('530: Failed to save pending note:', await noteResponse.text());
          }
        }
      } catch (noteError) {
        console.warn('530: Failed to save pending note', noteError);
      }
    }

    return result.data;
  } catch (error) {
    console.error('530: Failed to update content channels', error);
    throw error;
  }
}

// Mock channel groups for development
function getMockChannelGroups() {
  return [
    {
      id: 'general',
      slug: 'general',
      name: 'General',
      icon: '📢',
      channels: [
        { id: 'main-events', slug: 'main-events', name: 'Main Events', icon: '📣', description: 'Important announcements' },
        { id: 'intros', slug: 'intros', name: 'Intros', icon: '👋', description: 'New member introductions' },
        { id: 'jobhunt', slug: 'jobhunt', name: 'Job Hunt', icon: '💼', description: 'Job leads and opportunities' }
      ]
    },
    {
      id: 'ai',
      slug: 'ai',
      name: 'AI',
      icon: '🤖',
      channels: [
        { id: 'ai-tips', slug: 'ai-tips', name: 'AI Tips', icon: '💡', description: 'Prompts and workflow tricks' },
        { id: 'art', slug: 'art', name: 'Art', icon: '🖼️', description: 'AI art and generative techniques' },
        { id: 'llm', slug: 'llm', name: 'LLM', icon: '🧠', description: 'Language model discussions' }
      ]
    }
  ];
}

// Mock hierarchy for development
function getMockHierarchy() {
  return [
    {
      id: '1',
      slug: 'ai',
      name: 'Artificial Intelligence',
      description: 'AI, machine learning, and related technologies',
      depth: 0,
      children: [
        { id: '1-1', slug: 'llm', name: 'Large Language Models', depth: 1, children: [] },
        { id: '1-2', slug: 'ai-art', name: 'AI Art', depth: 1, children: [] },
        { id: '1-3', slug: 'computer-vision', name: 'Computer Vision', depth: 1, children: [] }
      ]
    },
    {
      id: '2',
      slug: 'web-development',
      name: 'Web Development',
      description: 'Frontend, backend, and full-stack development',
      depth: 0,
      children: [
        { id: '2-1', slug: 'frontend-frameworks', name: 'Frontend Frameworks', depth: 1, children: [] },
        { id: '2-2', slug: 'apis', name: 'APIs', depth: 1, children: [] }
      ]
    }
  ];
}

// Track tag co-occurrence for smart suggestions
async function trackTagCoOccurrence(tagSlugs) {
  if (!apiConfig.baseUrl) {
    console.log('530: No API configured - cannot track co-occurrence');
    return;
  }

  if (!tagSlugs || tagSlugs.length < 2) {
    // Need at least 2 tags for co-occurrence
    return;
  }

  try {
    // Get tag UUIDs from slugs
    const response = await fetch(`${apiConfig.baseUrl}/tags?slugs=${tagSlugs.join(',')}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch tag IDs: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success || !result.data || result.data.length < 2) {
      console.warn('530: Not enough valid tags for co-occurrence tracking');
      return;
    }

    // Extract UUIDs
    const tagIds = result.data.map(tag => tag.id);

    // Call the database function to increment co-occurrence
    const coResponse = await fetch(`${apiConfig.baseUrl}/tags/co-occurrence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tagIds })
    });

    if (coResponse.ok) {
      console.log('530: Tag co-occurrence tracked for', tagSlugs.length, 'tags');
    } else {
      console.warn('530: Failed to track co-occurrence:', coResponse.status);
    }
  } catch (error) {
    console.error('530: Error tracking tag co-occurrence', error);
    // Don't throw - this is a background operation that shouldn't fail the main save
  }
}

// Get user stats (tags count, notes count)
async function handleGetUserStats() {
  const authHeaders = await getAuthHeader();

  if (!authHeaders.Authorization) {
    return { tags: 0, notes: 0 };
  }

  try {
    const response = await fetch(`${apiConfig.baseUrl}/user/stats`, {
      headers: authHeaders
    });

    if (!response.ok) {
      console.warn('530: Failed to fetch user stats:', response.status);
      return { tags: 0, notes: 0 };
    }

    const result = await response.json();
    return result.data || { tags: 0, notes: 0 };
  } catch (error) {
    console.error('530: Error fetching user stats', error);
    return { tags: 0, notes: 0 };
  }
}

// Get recent posts
async function handleGetRecentPosts() {
  const authHeaders = await getAuthHeader();

  try {
    const response = await fetch(`${apiConfig.baseUrl}/posts/recent?limit=5`, {
      headers: authHeaders
    });

    if (!response.ok) {
      console.warn('530: Failed to fetch recent posts:', response.status);
      return [];
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('530: Error fetching recent posts', error);
    return [];
  }
}

// Listen for extension install/update
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('530: Extension installed');
    // Set default local API config
    chrome.storage.sync.set({
      apiUrl: 'http://localhost:3000/api'
    });
    console.log('530: Default API config set to local Next.js server');
  } else if (details.reason === 'update') {
    console.log('530: Extension updated');
  }
});
