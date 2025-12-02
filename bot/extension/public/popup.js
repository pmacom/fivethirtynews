// 530 Popup Script
console.log('530: Popup loaded');

// Load and display data
async function loadData() {
  try {
    // Get tags from background script
    const tagsResponse = await chrome.runtime.sendMessage({ action: 'getTags' });

    if (tagsResponse.success) {
      const tags = tagsResponse.data;
      updateStats(tags);
      displayRecentTags(tags);
    } else {
      console.error('530: Failed to load tags', tagsResponse.error);
      showEmptyState();
    }

    // Get content count from background script
    const countResponse = await chrome.runtime.sendMessage({ action: 'getContentCount' });

    if (countResponse.success) {
      const contentCount = countResponse.data.total;
      document.getElementById('contentCount').textContent = contentCount;
    } else {
      console.error('530: Failed to load content count', countResponse.error);
      document.getElementById('contentCount').textContent = '0';
    }
  } catch (error) {
    console.error('530: Error loading data', error);
    showEmptyState();
    document.getElementById('contentCount').textContent = '0';
  }
}

// Update statistics
function updateStats(tags) {
  const totalTags = tags.length;

  // Count today's tags
  const today = new Date().toDateString();
  const todayTags = tags.filter(tag => {
    const tagDate = new Date(tag.timestamp).toDateString();
    return tagDate === today;
  }).length;

  // Check Supabase connection status
  chrome.storage.sync.get(['supabaseUrl', 'supabaseKey'], (result) => {
    const status = (result.supabaseUrl && result.supabaseKey) ? 'Connected' : 'Mock Mode';
    document.getElementById('status').textContent = status;
  });

  document.getElementById('totalTags').textContent = totalTags;
  document.getElementById('todayTags').textContent = todayTags;
}

// Display recent tags
function displayRecentTags(tags) {
  const tagList = document.getElementById('tagList');

  if (tags.length === 0) {
    showEmptyState();
    return;
  }

  // Sort by timestamp (most recent first) and take top 5
  const recentTags = tags
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5);

  tagList.innerHTML = recentTags.map(tag => {
    const timeAgo = getTimeAgo(tag.timestamp);
    const tagBadges = formatTagBadges(tag.tags || []);
    return `
      <div class="tag-item">
        <div class="tag-author">${escapeHtml(tag.author)}</div>
        <div class="tag-text">${escapeHtml(tag.tweetText)}</div>
        ${tagBadges ? `<div class="tag-badges">${tagBadges}</div>` : ''}
        <div class="tag-time">${timeAgo}</div>
      </div>
    `;
  }).join('');
}

// Format tag badges for display
function formatTagBadges(tags) {
  if (!tags || tags.length === 0) return '';

  return tags.slice(0, 3).map(tagObj => {
    const tagName = typeof tagObj === 'string' ? tagObj : tagObj.tag;
    return `<span class="tag-badge">${escapeHtml(tagName)}</span>`;
  }).join('');
}

// Show empty state
function showEmptyState() {
  const tagList = document.getElementById('tagList');
  tagList.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">🏷️</div>
      <div class="empty-state-text">
        No tags yet. Visit X.com and click the 530 button on any post to start tagging!
      </div>
    </div>
  `;

  document.getElementById('totalTags').textContent = '0';
  document.getElementById('todayTags').textContent = '0';
}

// Get human-readable time ago
function getTimeAgo(timestamp) {
  const now = new Date();
  const tagTime = new Date(timestamp);
  const diffMs = now - tagTime;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return tagTime.toLocaleDateString();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Open options page
document.getElementById('openOptions').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Load data on popup open
loadData();

// Refresh data every 5 seconds while popup is open
setInterval(loadData, 5000);
