// Application State
let updatesList = [];
let currentFilter = 'all';
let currentSearchQuery = '';
let selectedUpdateId = null;

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const btnIcon = document.getElementById('btn-icon');
const btnSpinner = document.getElementById('btn-spinner');
const lastUpdatedTime = document.getElementById('last-updated-time');

const searchInput = document.getElementById('search-input');
const filterTags = document.querySelectorAll('.filter-tag');

const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const emptyState = document.getElementById('empty-state');
const notesGrid = document.getElementById('notes-grid');

// Drawer DOM Elements
const tweetDrawer = document.getElementById('tweet-drawer');
const closeDrawerBtn = document.getElementById('close-drawer-btn');
const cancelDrawerBtn = document.getElementById('cancel-drawer-btn');
const shareTweetBtn = document.getElementById('share-tweet-btn');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const drawerUpdateType = document.getElementById('drawer-update-type');
const drawerUpdateDate = document.getElementById('drawer-update-date');

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    setupEventListeners();
});

// Event Listeners setup
function setupEventListeners() {
    refreshBtn.addEventListener('click', fetchReleaseNotes);
    retryBtn.addEventListener('click', fetchReleaseNotes);
    
    // Search input handler with debounce
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearchQuery = e.target.value.toLowerCase().trim();
            filterAndRenderUpdates();
        }, 200);
    });
    
    // Filter tags click handler
    filterTags.forEach(tag => {
        tag.addEventListener('click', () => {
            filterTags.forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            currentFilter = tag.dataset.type;
            filterAndRenderUpdates();
        });
    });
    
    // Drawer Close handlers
    closeDrawerBtn.addEventListener('click', closeDrawer);
    cancelDrawerBtn.addEventListener('click', closeDrawer);
    tweetDrawer.addEventListener('click', (e) => {
        if (e.target === tweetDrawer) {
            closeDrawer();
        }
    });
    
    // Character counter check
    tweetTextarea.addEventListener('input', checkTweetLength);
    
    // Tweet submit handler
    shareTweetBtn.addEventListener('click', publishTweet);
}

// Fetch notes from Flask API
async function fetchReleaseNotes() {
    showLoading(true);
    showError(false);
    
    try {
        const response = await fetch('/api/release-notes');
        const data = await response.json();
        
        if (data.success && Array.isArray(data.updates)) {
            updatesList = data.updates;
            updateLastCheckedTime();
            filterAndRenderUpdates();
            showLoading(false);
        } else {
            throw new Error(data.error || 'Invalid data structure received');
        }
    } catch (err) {
        console.error('Error fetching release notes:', err);
        errorMessage.textContent = err.message || 'Could not reach server or retrieve feed.';
        showLoading(false);
        showError(true);
    }
}

// Control UI visibility during load/error
function showLoading(isLoading) {
    if (isLoading) {
        loadingState.classList.remove('hide');
        notesGrid.classList.add('hide');
        emptyState.classList.add('hide');
        
        // Spin header button
        btnIcon.classList.add('hide');
        btnSpinner.classList.remove('hide');
        refreshBtn.disabled = true;
    } else {
        loadingState.classList.add('hide');
        
        // Stop spinner
        btnIcon.classList.remove('hide');
        btnSpinner.classList.add('hide');
        refreshBtn.disabled = false;
    }
}

function showError(hasError) {
    if (hasError) {
        errorState.classList.remove('hide');
        notesGrid.classList.add('hide');
        emptyState.classList.add('hide');
    } else {
        errorState.classList.add('hide');
    }
}

function updateLastCheckedTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    lastUpdatedTime.textContent = `Last checked: ${timeString}`;
}

// Helper: Strip HTML tags to get pure text
function stripHtml(html) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    // Replace double spaces and clean up text
    return (tempDiv.textContent || tempDiv.innerText || "").replace(/\s+/g, ' ').trim();
}

// Main logic: filtering notes list and rendering
function filterAndRenderUpdates() {
    let filtered = updatesList;
    
    // 1. Filter by tag category
    if (currentFilter !== 'all') {
        filtered = filtered.filter(item => {
            const type = item.type.toLowerCase();
            return type.includes(currentFilter);
        });
    }
    
    // 2. Filter by search query
    if (currentSearchQuery) {
        filtered = filtered.filter(item => {
            const typeMatch = item.type.toLowerCase().includes(currentSearchQuery);
            const dateMatch = item.date.toLowerCase().includes(currentSearchQuery);
            const bodyText = stripHtml(item.description_html).toLowerCase();
            const contentMatch = bodyText.includes(currentSearchQuery);
            
            return typeMatch || dateMatch || contentMatch;
        });
    }
    
    // 3. Render
    renderGrid(filtered);
}

// Render filtered notes inside grid
function renderGrid(items) {
    notesGrid.innerHTML = '';
    
    if (items.length === 0) {
        notesGrid.classList.add('hide');
        emptyState.classList.remove('hide');
        return;
    }
    
    emptyState.classList.add('hide');
    notesGrid.classList.remove('hide');
    
    items.forEach(item => {
        const typeClass = item.type.toLowerCase();
        let displayTypeClass = 'other';
        if (typeClass.includes('feature')) displayTypeClass = 'feature';
        else if (typeClass.includes('change')) displayTypeClass = 'change';
        else if (typeClass.includes('deprecat')) displayTypeClass = 'deprecation';
        
        const card = document.createElement('div');
        card.className = `note-card ${selectedUpdateId === item.id ? 'selected' : ''}`;
        card.id = item.id;
        
        card.innerHTML = `
            <div class="card-header">
                <span class="type-badge ${displayTypeClass}">${item.type}</span>
                <span class="update-date">${item.date}</span>
            </div>
            <div class="card-body">
                ${item.description_html}
            </div>
            <div class="card-footer">
                <a href="${item.link}" target="_blank" class="docs-link" onclick="event.stopPropagation();">
                    <span>Source Docs</span>
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                </a>
                <button class="btn btn-primary share-btn btn-sm" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span>Tweet</span>
                </button>
            </div>
        `;
        
        // Add click selection to card
        card.addEventListener('click', (e) => {
            selectUpdate(item.id);
        });
        
        // Add click behavior to Tweet button
        const cardShareBtn = card.querySelector('.share-btn');
        cardShareBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevents multiple trigger issues
            selectUpdate(item.id);
            openTweetDrawer(item);
        });
        
        notesGrid.appendChild(card);
    });
}

// Select an update visually
function selectUpdate(id) {
    // Remove previous selections
    const prevSelected = document.querySelector('.note-card.selected');
    if (prevSelected) {
        prevSelected.classList.remove('selected');
    }
    
    selectedUpdateId = id;
    const cardElement = document.getElementById(id);
    if (cardElement) {
        cardElement.classList.add('selected');
    }
}

// Open tweet details composer drawer
function openTweetDrawer(item) {
    // Dynamic drawer detail labels
    drawerUpdateType.textContent = item.type;
    // Set appropriate badge class
    drawerUpdateType.className = 'type-badge';
    const typeClass = item.type.toLowerCase();
    if (typeClass.includes('feature')) drawerUpdateType.classList.add('feature');
    else if (typeClass.includes('change')) drawerUpdateType.classList.add('change');
    else if (typeClass.includes('deprecat')) drawerUpdateType.classList.add('deprecation');
    else drawerUpdateType.classList.add('other');
    
    drawerUpdateDate.textContent = item.date;
    
    // Generate tweet text
    const cleanText = stripHtml(item.description_html);
    const tweetText = generateTweetDraft(item.type, item.date, cleanText, item.link);
    
    tweetTextarea.value = tweetText;
    checkTweetLength();
    
    // Show drawer
    tweetDrawer.classList.add('open');
    tweetTextarea.focus();
}

// Generate the initial tweet copy
function generateTweetDraft(type, date, text, link) {
    // Structure: "📢 BigQuery [Type] ([Date]): [Text] #BigQuery #GoogleCloud [Link]"
    const prefix = `📢 BigQuery ${type} (${date}): `;
    const suffix = `\n\n#BigQuery #GoogleCloud\n${link}`;
    
    const maxTextLen = 280 - prefix.length - suffix.length;
    let mainText = text;
    
    if (mainText.length > maxTextLen) {
        mainText = mainText.substring(0, maxTextLen - 3) + '...';
    }
    
    return `${prefix}${mainText}${suffix}`;
}

// Close tweet drawer
function closeDrawer() {
    tweetDrawer.classList.remove('open');
}

// Calculate and show character limits
function checkTweetLength() {
    const len = tweetTextarea.value.length;
    charCounter.textContent = `${len} / 280`;
    
    if (len > 280) {
        charCounter.classList.add('error');
        shareTweetBtn.disabled = true;
    } else {
        charCounter.classList.remove('error');
        shareTweetBtn.disabled = false;
    }
}

// Redirect to Twitter Web Intent with text content
function publishTweet() {
    const text = tweetTextarea.value;
    if (text.length > 280) return;
    
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(intentUrl, '_blank', 'width=550,height=420');
    closeDrawer();
}
