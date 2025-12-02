// 530 Popup Script with Auth
console.log('530: Popup loaded');

// DOM elements
const elements = {
  loadingState: document.getElementById('loadingState'),
  mainContent: document.getElementById('mainContent'),
  loggedOutState: document.getElementById('loggedOutState'),
  loggedInState: document.getElementById('loggedInState'),
  userBadge: document.getElementById('userBadge'),
  userAvatar: document.getElementById('userAvatar'),
  userName: document.getElementById('userName'),
  modBadge: document.getElementById('modBadge'),
  discordLoginBtn: document.getElementById('discordLoginBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  statTags: document.getElementById('statTags'),
  statNotes: document.getElementById('statNotes'),
  statTotal: document.getElementById('statTotal'),
  postList: document.getElementById('postList'),
};

// Current user state
let currentUser = null;

// Platform emoji map
const platformEmoji = {
  twitter: '𝕏',
  youtube: '▶️',
  reddit: '🔴',
  bluesky: '🦋',
};

// Initialize popup
async function init() {
  try {
    // Check auth state
    const authResponse = await chrome.runtime.sendMessage({ action: 'getAuthState' });

    if (authResponse.success && authResponse.data?.user) {
      currentUser = authResponse.data.user;
      showLoggedInState();
      await loadUserData();
    } else {
      showLoggedOutState();
    }
  } catch (error) {
    console.error('530: Init error', error);
    showLoggedOutState();
  }
}

// Show logged out state
function showLoggedOutState() {
  elements.loadingState.classList.add('hidden');
  elements.mainContent.classList.remove('hidden');
  elements.loggedOutState.style.display = 'flex';
  elements.loggedInState.style.display = 'none';
  elements.userBadge.classList.add('hidden');
}

// Show logged in state
function showLoggedInState() {
  elements.loadingState.classList.add('hidden');
  elements.mainContent.classList.remove('hidden');
  elements.loggedOutState.style.display = 'none';
  elements.loggedInState.style.display = 'block';

  // Update user badge
  elements.userBadge.classList.remove('hidden');
  elements.userName.textContent = currentUser.display_name;

  if (currentUser.avatar) {
    elements.userAvatar.src = currentUser.avatar;
    elements.userAvatar.style.display = 'block';
  } else {
    elements.userAvatar.style.display = 'none';
  }

  // Show mod badge if moderator
  if (currentUser.is_moderator) {
    elements.modBadge.classList.remove('hidden');
  } else {
    elements.modBadge.classList.add('hidden');
  }
}

// Load user data (stats and recent posts)
async function loadUserData() {
  try {
    // Load stats and recent posts in parallel
    const [statsResponse, postsResponse, contentResponse] = await Promise.all([
      chrome.runtime.sendMessage({ action: 'getUserStats' }),
      chrome.runtime.sendMessage({ action: 'getRecentPosts' }),
      chrome.runtime.sendMessage({ action: 'getContentCount' }),
    ]);

    // Update stats
    if (statsResponse.success && statsResponse.data) {
      elements.statTags.textContent = statsResponse.data.tags || 0;
      elements.statNotes.textContent = statsResponse.data.notes || 0;
    }

    if (contentResponse.success && contentResponse.data) {
      elements.statTotal.textContent = contentResponse.data.total || 0;
    }

    // Update recent posts
    if (postsResponse.success && postsResponse.data) {
      displayRecentPosts(postsResponse.data);
    } else {
      displayEmptyPosts();
    }
  } catch (error) {
    console.error('530: Failed to load user data', error);
    displayEmptyPosts();
  }
}

// Display recent posts
function displayRecentPosts(posts) {
  if (!posts || posts.length === 0) {
    displayEmptyPosts();
    return;
  }

  elements.postList.innerHTML = posts.slice(0, 5).map(post => {
    const emoji = platformEmoji[post.platform] || '📄';
    const title = post.title || post.content_text || 'Untitled';
    const channel = post.primary_channel || 'uncategorized';
    const timeAgo = getTimeAgo(post.created_at);

    return `
      <div class="post-item" data-url="${escapeHtml(post.content_url || '')}">
        <span class="post-platform">${emoji}</span>
        <div class="post-content">
          <div class="post-title">${escapeHtml(title)}</div>
          <div class="post-meta">
            <span class="post-channel">${escapeHtml(channel)}</span>
            <span>${timeAgo}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers
  elements.postList.querySelectorAll('.post-item').forEach(item => {
    item.addEventListener('click', () => {
      const url = item.dataset.url;
      if (url) {
        chrome.tabs.create({ url });
      }
    });
  });
}

// Display empty posts state
function displayEmptyPosts() {
  elements.postList.innerHTML = `
    <div class="empty-posts">
      No content yet. Start tagging posts on social media!
    </div>
  `;
}

// Get human-readable time ago
function getTimeAgo(timestamp) {
  if (!timestamp) return '';

  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Handle Discord login
async function handleLogin() {
  try {
    elements.discordLoginBtn.disabled = true;
    elements.discordLoginBtn.textContent = 'Signing in...';

    const response = await chrome.runtime.sendMessage({ action: 'login' });

    if (response.success && response.data?.user) {
      currentUser = response.data.user;
      showLoggedInState();
      await loadUserData();
    } else {
      console.error('530: Login failed', response.error);
      alert(response.error || 'Login failed. Please try again.');
    }
  } catch (error) {
    console.error('530: Login error', error);
    alert('Login failed. Please try again.');
  } finally {
    elements.discordLoginBtn.disabled = false;
    elements.discordLoginBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
      </svg>
      Sign in with Discord
    `;
  }
}

// Handle logout
async function handleLogout() {
  try {
    await chrome.runtime.sendMessage({ action: 'logout' });
    currentUser = null;
    showLoggedOutState();
  } catch (error) {
    console.error('530: Logout error', error);
  }
}

// Handle settings
function handleSettings() {
  chrome.runtime.openOptionsPage();
}

// Event listeners
elements.discordLoginBtn.addEventListener('click', handleLogin);
elements.logoutBtn.addEventListener('click', handleLogout);
elements.settingsBtn.addEventListener('click', handleSettings);

// Initialize
init();

// Refresh data every 30 seconds while popup is open
setInterval(async () => {
  if (currentUser) {
    await loadUserData();
  }
}, 30000);
