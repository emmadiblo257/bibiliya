let bibleData = null;
let currentBookIndex = 0;
let currentChapterIndex = 0;
let currentSelection = { book: null, chapter: null };
let currentVerseNumber = null;
let selectedVerseEl = null;
let touchStartX = 0;
let touchEndX = 0;
let lang;

let appSettings = {
    bible: 'Kinyarwanda',
    lang: 'rw',
    fontSize: 20,
    theme: 'light',
    layout: 'para',
    bookSelectMode: 'grid',
    notifTime: '08:00',
    notifEnabled: false
};

const bookAbbreviations = {
    "ITANGIRIRO": "Ita", "KUVA": "Kuv", "ABALEWI": "Lew", "KUBARA": "Kub", "GUTEGEKA KWA KABIRI": "Gut", 
    "YOSUWA": "Yos", "ABACAMANZA": "Abac", "RUTI": "Rut", "1 SAMWELI": "1Sam", "2 SAMWELI": "2Sam", 
    "1 ABAMI": "1Abm", "2 ABAMI": "2Abm", "1 NGOMA": "1Ngo", "2 NGOMA": "2Ngo", "EZIRA": "Ezr", 
    "NEHEMIYA": "Neh", "ESITERI": "Est", "YOBU": "Yob", "ZABURI": "Zab", "IMIGANI": "Imig", 
    "UMUBWIRIZA": "Umu", "INDIRIMBO ZA SALOMO": "Ind", "YESAYA": "Yes", "YEREMIYA": "Yer", 
    "AMAGANYA YA YEREMIYA": "Ama", "EZEKIYELI": "Ezk", "DANIYELI": "Dan", "HOSEYA": "Hos", 
    "YOWELI": "Yow", "AMOSI": "Amo", "OBADIYA": "Oba", "YONA": "Yon", "MIKA": "Mik", 
    "NAHUMU": "Nah", "HABAKUKI": "Hab", "ZEFANIYA": "Zef", "HAGAYI": "Hag", "ZEKARIYA": "Zek", 
    "MALAKI": "Mal", "MATAYO": "Mat", "MARIKO": "Mrk", "LUKA": "Luk", "YOHANA": "Yoh", 
    "IBYAKOZWE N’INTUMWA": "Ibya", "ABAROMA": "Rom", "1 ABAKORINTO": "1Kor", "2 ABAKORINTO": "2Kor", 
    "ABAGALATIYA": "Gal", "ABEFESO": "Ef", "ABAFILIPI": "Flp", "ABAKOLOSAYI": "Kol", 
    "1 ABATESALONIKE": "1Tes", "2 ABATESALONIKE": "2Tes", "1 TIMOTEYO": "1Tim", "2 TIMOTEYO": "2Tim", 
    "TITO": "Tit", "FILEMONI": "Flm", "ABAHEBURAYO": "Heb", "YAKOBO": "Yak", "1 PETERO": "1Ptr", 
    "2 PETERO": "2Ptr", "1 YOHANA": "1Yoh", "2 YOHANA": "2Yoh", "3 YOHANA": "3Yoh", "YUDA": "Yud", 
    "IBYAHISHUWE": "Ibyh"
};

// DOM Elements
const drawer = document.getElementById('drawer');
const overlay = document.getElementById('overlay');
const menuBtn = document.getElementById('menu-btn');
const currentBookLabel = document.getElementById('current-book');
const currentChapterLabel = document.getElementById('current-chapter');
const bibleContent = document.getElementById('bible-content');
const bookTitle = document.getElementById('book-title');
const chapterBody = document.getElementById('chapter-body');
const selectionModal = document.getElementById('selection-modal');
const bookGrid = document.getElementById('book-grid');
const chapterGrid = document.getElementById('chapter-grid');

async function init() {
    loadSettings();
    lang = new LangJS({
        availableLanguages: ['rw', 'rn', 'en', 'fr'],
        defaultLanguage: appSettings.lang,
        languagePath: './lang/',
        persistKey: 'app_lang_pref',
        debug: true,
        onLanguageChange: (newLang) => {
            appSettings.lang = newLang;
            saveSettings();
        }
    });

    try {
        await loadBible(appSettings.bible);
        applyTheme();
        applyLayout();
        setupInteractions();
    } catch (err) {
        console.error("Init failed:", err);
    }
}

function loadSettings() {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
        appSettings = { ...appSettings, ...JSON.parse(saved) };
    } else {
        // Auto-detect browser language if first time
        const browserLang = navigator.language.split('-')[0];
        const supported = ['rw', 'rn', 'en', 'fr'];
        if (supported.includes(browserLang)) {
            appSettings.lang = browserLang;
        }
    }
    
    applyTheme();
    
    const bibleSelect = document.getElementById('bible-select');
    if (bibleSelect) bibleSelect.value = appSettings.bible;
    
    const langSelect = document.getElementById('lang-select');
    if (langSelect) langSelect.value = appSettings.lang;
    
    const fontRange = document.getElementById('font-range');
    if (fontRange) fontRange.value = appSettings.fontSize;
    
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = appSettings.theme;
    
    const layoutSelect = document.getElementById('layout-select');
    if (layoutSelect) layoutSelect.value = appSettings.layout;

    const bookModeSelect = document.getElementById('book-mode-select');
    if (bookModeSelect) bookModeSelect.value = appSettings.bookSelectMode;

    const notifEnabledInput = document.getElementById('notif-enabled');
    if (notifEnabledInput) notifEnabledInput.checked = appSettings.notifEnabled;

    const notifTimeInput = document.getElementById('notif-time');
    if (notifTimeInput) notifTimeInput.value = appSettings.notifTime;

    document.getElementById('notif-time-container')?.classList.toggle('hidden', !appSettings.notifEnabled);
    updateFontDemo();
}

function saveSettings() {
    localStorage.setItem('appSettings', JSON.stringify(appSettings));
}

async function loadBible(version) {
    toggleLoading(true);
    let path = '';
    if (version === 'Kinyarwanda') path = 'Kinyarwanda/bibiliya.json';
    else if (version === 'English') path = 'English/bibiliya.json';
    else if (version === 'Swahili') path = 'Swahili/bibiliya.json';
    else if (version.startsWith('French_')) {
        const mapping = {
            'French_S21': 'French Bible Segond 21 (S21).json',
            'French_LSG': 'French Louis Segond (1910).json',
            'French_NBS': 'French Nouvelle Bible Segond.json',
            'French_Semeur': 'French Semeur.json',
            'French_TOB': 'French Traduction Œcuménique de la Bible.json'
        };
        path = 'French/' + mapping[version];
    } else {
        path = `${version}/bibiliya.json`;
    }

    try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`Failed to load ${version} Bible`);
        bibleData = await response.json();
        
        // Flatten books for easier navigation
        bibleData.allBooks = [];
        bibleData.testaments.forEach((t, tIdx) => {
            if (!t || !t.books) return;
            t.books.forEach((b, bIdx) => {
                if (!b) return;
                bibleData.allBooks.push({...b, testament: t.name, tIdx, bIdx});
            });
        });

        loadBibleData(version);
        buildBookGrid();
    } catch (e) {
        console.error("Erreur lors du chargement de la Bible", e);
        alert(lang.get('selection.error_access', {version: version}));
    } finally {
        toggleLoading(false);
    }
}

function loadBibleData(version) {
    const lastRead = JSON.parse(localStorage.getItem('lastRead_' + version) || '{"bIdx":0, "cIdx":0}');
    loadContent(lastRead.bIdx, lastRead.cIdx);
}

function toggleLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = show ? 'flex' : 'none';
}

function setupInteractions() {
    console.log("Setting up interactions...");
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(e => console.warn("SW registration failed", e));
    }

    const setE = (id, event, fn) => {
        const el = document.getElementById(id);
        if (el) el[event] = fn;
    };

    setE('toggle-theme-drawer', 'onclick', () => {
        appSettings.theme = appSettings.theme === 'dark' ? 'light' : 'dark';
        applyTheme();
        saveSettings();
        closeDrawer();
    });
    
    setE('font-btn', 'onclick', () => document.getElementById('settings-modal')?.classList.add('show'));
    setE('search-btn', 'onclick', () => {
        document.getElementById('search-modal')?.classList.add('show');
        document.getElementById('search-input')?.focus();
    });
    setE('close-search', 'onclick', () => document.getElementById('search-modal')?.classList.remove('show'));
    setE('search-input', 'oninput', (e) => {
        clearTimeout(window.searchTimeout);
        window.searchTimeout = setTimeout(() => handleSearch(e.target.value), 300);
    });

    document.querySelectorAll('.tab').forEach(tab => {
        tab.onclick = () => showModalTab(tab.getAttribute('data-tab'));
    });

    // Settings logic
    setE('close-settings', 'onclick', () => document.getElementById('settings-modal')?.classList.remove('show'));
    
    setE('bible-select', 'onchange', (e) => {
        appSettings.bible = e.target.value;
        saveSettings();
        loadBible(appSettings.bible);
    });
    
    setE('lang-select', 'onchange', (e) => {
        lang.setLanguage(e.target.value);
    });

    setE('font-range', 'oninput', (e) => {
        appSettings.fontSize = e.target.value;
        if (chapterBody) chapterBody.style.fontSize = appSettings.fontSize + 'px';
        updateFontDemo();
        saveSettings();
    });

    setE('book-mode-select', 'onchange', (e) => {
        appSettings.bookSelectMode = e.target.value;
        saveSettings();
        buildBookGrid();
    });

    setE('theme-select', 'onchange', (e) => {
        appSettings.theme = e.target.value;
        applyTheme();
        saveSettings();
    });

    setE('layout-select', 'onchange', (e) => {
        appSettings.layout = e.target.value;
        applyLayout();
        saveSettings();
    });

    setE('notif-enabled', 'onchange', async (e) => {
        appSettings.notifEnabled = e.target.checked;
        if (appSettings.notifEnabled) {
            if (Notification.permission === 'default') {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    alert(lang.get('settings.notif_permission_denied'));
                    e.target.checked = false;
                    appSettings.notifEnabled = false;
                }
            } else if (Notification.permission === 'denied') {
                alert(lang.get('settings.notif_permission_denied'));
                e.target.checked = false;
                appSettings.notifEnabled = false;
            }
        }
        document.getElementById('notif-time-container')?.classList.toggle('hidden', !appSettings.notifEnabled);
        saveSettings();
    });

    setE('notif-time', 'onchange', (e) => {
        appSettings.notifTime = e.target.value;
        saveSettings();
    });
    
    setE('theme-select', 'onchange', (e) => {
        appSettings.theme = e.target.value;
        applyTheme();
        saveSettings();
    });
    
    setE('layout-select', 'onchange', (e) => {
        appSettings.layout = e.target.value;
        applyLayout();
        saveSettings();
    });

    // Drawer items
    setE('nav-search', 'onclick', () => {
        document.getElementById('search-modal')?.classList.add('show');
        document.getElementById('search-input')?.focus();
        closeDrawer();
    });
    setE('nav-history', 'onclick', () => showHistory());
    setE('nav-bookmarks', 'onclick', () => showBookmarks());
    setE('nav-notes', 'onclick', () => showAllNotes());
    setE('nav-highlights', 'onclick', () => showHighlights());
    setE('nav-info', 'onclick', () => showContact());
    setE('nav-share', 'onclick', () => shareApp());
    setE('nav-settings', 'onclick', () => {
        document.getElementById('settings-modal')?.classList.add('show');
        closeDrawer();
    });

    setE('close-history', 'onclick', () => document.getElementById('history-modal')?.classList.remove('show'));
    setE('close-bookmarks', 'onclick', () => document.getElementById('bookmarks-modal')?.classList.remove('show'));
    setE('close-highlights-modal', 'onclick', () => document.getElementById('highlights-modal')?.classList.remove('show'));
    setE('close-all-notes-modal', 'onclick', () => document.getElementById('all-notes-modal')?.classList.remove('show'));
    setE('close-contact', 'onclick', () => document.getElementById('contact-modal')?.classList.remove('show'));

    // Bottom Bar
    setE('btn-bookmark', 'onclick', () => toggleBookmark());
    setE('btn-share', 'onclick', () => shareVerse());
    setE('btn-highlight', 'onclick', () => document.getElementById('highlight-colors')?.classList.toggle('hidden'));
    setE('btn-note', 'onclick', () => openNoteModal());

    document.querySelectorAll('.color-dot').forEach(dot => {
        dot.onclick = () => applyHighlight(dot.getAttribute('data-color'));
    });

    setE('save-note', 'onclick', () => saveNote());
    setE('close-notes', 'onclick', () => document.getElementById('notes-modal')?.classList.remove('show'));

    // Swipe
    if (chapterBody) {
        chapterBody.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX, false);
        chapterBody.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, false);
    }
}

function closeDrawer() {
    if (drawer) drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
}

function shareApp() {
    const url = window.location.href;
    if (navigator.share) {
        navigator.share({ title: 'Bibiliya Yera', url });
    } else {
        copyToClipboard(url, 'Ilinki yajyanywe!');
    }
}

function copyToClipboard(text, msg) {
    navigator.clipboard.writeText(text).then(() => alert(msg));
}

function handleSwipe() {
    if (touchEndX < touchStartX - 80) changeChapter(1);
    if (touchEndX > touchStartX + 80) changeChapter(-1);
}

function changeChapter(dir) {
    if (!bibleData) return;
    const book = bibleData.allBooks[currentBookIndex];
    let nextIdx = currentChapterIndex + dir;
    if (nextIdx >= 0 && nextIdx < book.chapters.length) {
        loadContent(currentBookIndex, nextIdx);
    } else if (dir > 0 && currentBookIndex < bibleData.allBooks.length - 1) {
        loadContent(currentBookIndex + 1, 0);
    } else if (dir < 0 && currentBookIndex > 0) {
        const prevBook = bibleData.allBooks[currentBookIndex - 1];
        loadContent(currentBookIndex - 1, prevBook.chapters.length - 1);
    }
}

function handleSearch(query) {
    const resultsContainer = document.getElementById('search-results');
    const loadingElem = document.getElementById('search-loading');
    if (!resultsContainer) return;

    const q = query.trim().toLowerCase();
    if (q.length < 3) {
        resultsContainer.innerHTML = '';
        loadingElem?.classList.add('hidden');
        return;
    }

    resultsContainer.innerHTML = '';
    loadingElem?.classList.remove('hidden');

    setTimeout(() => {
        let count = 0;
        try {
            if (bibleData && bibleData.testaments) {
                for (const testament of bibleData.testaments) {
                    if (count >= 100) break;
                    for (const book of testament.books) {
                        if (count >= 100) break;
                        for (let cIdx = 0; cIdx < book.chapters.length; cIdx++) {
                            const chap = book.chapters[cIdx];
                            if (count >= 100) break;
                            if (!chap.content) continue;
                            for (const item of chap.content) {
                                if (count >= 100) break;
                                if (item && item.type === 'verse' && item.text.toLowerCase().includes(q)) {
                                    const div = document.createElement('div');
                                    div.className = 'search-result-item';
                                    const fullBIdx = bibleData.allBooks.findIndex(b => b.name === book.name);
                                    div.innerHTML = `
                                        <div class="result-ref">${book.name} ${chap.number}:${item.number}</div>
                                        <div class="result-text">${item.text}</div>
                                    `;
                                    div.onclick = () => {
                                        currentVerseNumber = item.number;
                                        loadContent(fullBIdx, cIdx);
                                        document.getElementById('search-modal')?.classList.remove('show');
                                    };
                                    resultsContainer.appendChild(div);
                                    count++;
                                }
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Search error:", err);
        } finally {
            loadingElem?.classList.add('hidden');
            if (count === 0) {
                resultsContainer.innerHTML = `<div class="empty-state">${lang.get('search.empty')}</div>`;
            }
        }
    }, 100);
}

function updateFontDemo() {
    const demo = document.getElementById('font-demo');
    if (demo) demo.style.fontSize = appSettings.fontSize + 'px';
}

function showModalTab(tabId) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active-content'));
    document.getElementById(`${tabId.replace('s', '')}-grid-container`)?.classList.add('active-content');
    
    // Update modal title
    const header = selectionModal.querySelector('.modal-header');
    let title = lang.get('selection.book');
    if (tabId === 'chapters') title = bibleData.allBooks[currentBookIndex].name;
    if (tabId === 'verses') title = `${bibleData.allBooks[currentBookIndex].name} ${currentChapterIndex + 1}`;
    
    // Ensure we have a title bar if not present
    let titleBar = header.querySelector('.modal-title-bar');
    if (!titleBar) {
        titleBar = document.createElement('div');
        titleBar.className = 'modal-title-bar';
        header.prepend(titleBar);
    }
    
    titleBar.innerHTML = `
        <button id="modal-back-btn" class="action-btn" style="visibility: ${tabId === 'books' ? 'hidden' : 'visible'}">
            <i class="fas fa-arrow-left"></i>
        </button>
        <span style="flex: 1; text-align: center; font-weight: bold;">${title}</span>
        <button id="modal-close-btn" class="action-btn"><i class="fas fa-times"></i></button>
    `;
    
    document.getElementById('modal-back-btn').onclick = (e) => {
        e.stopPropagation();
        if (tabId === 'chapters') showModalTab('books');
        if (tabId === 'verses') showModalTab('chapters');
    };
    document.getElementById('modal-close-btn').onclick = (e) => {
        e.stopPropagation();
        selectionModal.classList.remove('show');
    };
}

function loadContent(bookIdx, chapIdx) {
    if (!bibleData) return;
    currentBookIndex = bookIdx;
    currentChapterIndex = chapIdx;
    
    // Persist last read
    localStorage.setItem('lastRead_' + appSettings.bible, JSON.stringify({ bIdx: bookIdx, cIdx: chapIdx }));

    const book = bibleData.allBooks[bookIdx];
    const chapter = book.chapters[chapIdx];

    addToHistory(book.name, chapter.number);
    if (currentBookLabel) currentBookLabel.innerText = normalizeBookName(book.name);
    if (currentChapterLabel) currentChapterLabel.innerText = chapter.number;
    if (bookTitle) bookTitle.innerText = book.name.toUpperCase();
    if (chapterBody) {
        chapterBody.innerHTML = '';
        chapterBody.style.fontSize = appSettings.fontSize + 'px';
        applyLayout();

        let currentP = document.createElement('p');
        let isFirstVerse = true;
        
        if (chapter && chapter.content) {
            chapter.content.forEach(item => {
                if (!item) return;
                if (item.type === 'subheading') {
                    if (currentP.innerHTML !== '') chapterBody.appendChild(currentP);
                    currentP = document.createElement('p');
                    const sh = document.createElement('div');
                    sh.className = 'subheading';
                    sh.innerText = item.text;
                    chapterBody.appendChild(sh);
                } else if (item.type === 'verse') {
                    const span = document.createElement('span');
                    span.className = 'verse';
                    span.id = `v-${item.number}`;
                    
                    if (isFirstVerse && item.number === 1) {
                        span.innerHTML = `<span class="drop-cap">${chapter.number}</span><span class="verse-num">${item.number}</span>${item.text}`;
                        isFirstVerse = false;
                    } else {
                        span.innerHTML = `<span class="verse-num">${item.number}</span>${item.text}`;
                    }

                    span.onclick = (e) => {
                        e.stopPropagation();
                        toggleVerseSelection(span);
                    };
                    currentP.appendChild(span);
                }
            });
        }
        if (currentP.innerHTML !== '') chapterBody.appendChild(currentP);
        applyStoredStyles();

        if (currentVerseNumber) {
            const target = document.getElementById(`v-${currentVerseNumber}`);
            if (target) {
                setTimeout(() => {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    toggleVerseSelection(target);
                }, 100);
            }
            currentVerseNumber = null;
        } else {
            window.scrollTo(0, 0);
        }
    }
    document.getElementById('bottom-bar')?.classList.add('hidden');
}

function toggleVerseSelection(el) {
    if (selectedVerseEl) selectedVerseEl.classList.remove('selected');
    if (selectedVerseEl === el) {
        selectedVerseEl = null;
        document.getElementById('bottom-bar')?.classList.add('hidden');
    } else {
        el.classList.add('selected');
        selectedVerseEl = el;
        document.getElementById('bottom-bar')?.classList.remove('hidden');
        const ref = getSelectedRef();
        const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
        const isBookmarked = bookmarks.some(b => b.ref === ref);
        const btnB = document.getElementById('btn-bookmark');
        if (btnB) btnB.style.color = isBookmarked ? '#f44336' : 'white';
    }
}

function getSelectedRef() {
    if (!selectedVerseEl || !bibleData) return null;
    const bookName = bibleData.allBooks[currentBookIndex].name;
    const chapNum = bibleData.allBooks[currentBookIndex].chapters[currentChapterIndex].number;
    const verseNum = selectedVerseEl.id.split('-')[1];
    return `${bookName} ${chapNum}:${verseNum}`;
}

function toggleBookmark() {
    const ref = getSelectedRef();
    if (!ref) return;
    let bms = JSON.parse(localStorage.getItem('bookmarks') || '[]');
    const idx = bms.findIndex(b => b.ref === ref);
    const btnB = document.getElementById('btn-bookmark');
    if (idx === -1) {
        const text = selectedVerseEl.innerText.replace(/^\d+/, '').trim();
        bms.push({ ref, text, bIdx: currentBookIndex, cIdx: currentChapterIndex, vNum: ref.split(':')[1] });
        if (btnB) btnB.style.color = '#f44336';
    } else {
        bms.splice(idx, 1);
        if (btnB) btnB.style.color = 'white';
    }
    localStorage.setItem('bookmarks', JSON.stringify(bms));
}

function addToHistory(bookName, chapNum) {
    let history = JSON.parse(localStorage.getItem('history') || '[]');
    const item = { bookName, chapNum, bIdx: currentBookIndex, cIdx: currentChapterIndex, time: Date.now() };
    history = history.filter(h => h.bookName !== bookName || h.chapNum !== chapNum);
    history.unshift(item);
    localStorage.setItem('history', JSON.stringify(history.slice(0, 20)));
}

function showHistory() {
    const list = document.getElementById('history-list');
    if (!list) return;
    list.innerHTML = '';
    const history = JSON.parse(localStorage.getItem('history') || '[]');
    if (history.length === 0) {
        list.innerHTML = `<div style="padding: 20px; text-align: center;">${lang.get('history.empty')}</div>`;
    } else {
        history.forEach(h => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.innerHTML = `<div class="result-ref">${h.bookName} ${h.chapNum}</div>`;
            div.onclick = () => {
                loadContent(h.bIdx, h.cIdx);
                document.getElementById('history-modal')?.classList.remove('show');
                closeDrawer();
            };
            list.appendChild(div);
        });
    }
    document.getElementById('history-modal')?.classList.add('show');
}

function showAllNotes() {
    const list = document.getElementById('all-notes-list');
    if (!list) return;
    list.innerHTML = '';
    const notes = JSON.parse(localStorage.getItem('notes') || '{}');
    const refs = Object.keys(notes);
    if (refs.length === 0) {
        list.innerHTML = `<div style="padding: 20px; text-align: center;">${lang.get('all_notes.empty')}</div>`;
    } else {
        refs.forEach(ref => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.innerHTML = `<div class="result-ref">${ref}</div><div class="result-text">${notes[ref]}</div>`;
            div.onclick = () => { 
                navigateToRef(ref); 
                document.getElementById('all-notes-modal')?.classList.remove('show'); 
            };
            list.appendChild(div);
        });
    }
    document.getElementById('all-notes-modal')?.classList.add('show');
    closeDrawer();
}

function showHighlights() {
    const list = document.getElementById('highlights-list');
    if (!list) return;
    list.innerHTML = '';
    const highlights = JSON.parse(localStorage.getItem('highlights') || '{}');
    const refs = Object.keys(highlights);
    if (refs.length === 0) {
        list.innerHTML = `<div style="padding: 20px; text-align: center;">${lang.get('highlights.empty')}</div>`;
    } else {
        refs.forEach(ref => {
            const text = getVerseTextByRef(ref);
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.style.borderLeft = `5px solid ${highlights[ref]}`;
            div.innerHTML = `<div class="result-ref">${ref}</div><div class="result-text">${text}</div>`;
            div.onclick = () => { 
                navigateToRef(ref); 
                document.getElementById('highlights-modal')?.classList.remove('show'); 
            };
            list.appendChild(div);
        });
    }
    document.getElementById('highlights-modal')?.classList.add('show');
    closeDrawer();
}

function getVerseTextByRef(ref) {
    if (!bibleData) return "...";
    try {
        const parts = ref.split(' ');
        const vPart = parts.pop();
        const bookName = parts.join(' ');
        const [chapNum, verseNum] = vPart.split(':');
        
        const book = bibleData.allBooks.find(b => b.name === bookName);
        if (!book) return "...";
        const chap = book.chapters.find(c => c.number == chapNum);
        if (!chap) return "...";
        const verse = chap.content.find(item => item && item.type === 'verse' && item.number == verseNum);
        return verse ? verse.text : "...";
    } catch (e) {
        return "...";
    }
}

function navigateToRef(ref) {
    if (!bibleData) return;
    const [bookPart, versePart] = ref.split(':');
    const bookName = bookPart.substring(0, bookPart.lastIndexOf(' '));
    const chapNum = bookPart.substring(bookPart.lastIndexOf(' ') + 1);
    const bIdx = bibleData.allBooks.findIndex(b => b.name === bookName);
    if (bIdx === -1) return;
    const cIdx = bibleData.allBooks[bIdx].chapters.findIndex(c => c.number == chapNum);
    if (cIdx === -1) return;
    currentVerseNumber = versePart;
    loadContent(bIdx, cIdx);
}

function showBookmarks() {
    const list = document.getElementById('bookmarks-list');
    if (!list) return;
    list.innerHTML = '';
    const bms = JSON.parse(localStorage.getItem('bookmarks') || '[]');
    if (bms.length === 0) {
        list.innerHTML = `<div style="padding: 20px; text-align: center;">${lang.get('bookmarks.empty')}</div>`;
    } else {
        bms.forEach(b => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.innerHTML = `<div class="result-ref">${b.ref}</div><div class="result-text">${b.text}</div>`;
            div.onclick = () => {
                currentVerseNumber = b.vNum;
                loadContent(b.bIdx, b.cIdx);
                document.getElementById('bookmarks-modal')?.classList.remove('show');
                closeDrawer();
            };
            list.appendChild(div);
        });
    }
    document.getElementById('bookmarks-modal')?.classList.add('show');
}

function showContact() {
    document.getElementById('contact-modal')?.classList.add('show');
    closeDrawer();
}

function applyStoredStyles() {
    if (!bibleData) return;
    const refPrefix = `${bibleData.allBooks[currentBookIndex].name} ${bibleData.allBooks[currentBookIndex].chapters[currentChapterIndex].number}:`;
    const hls = JSON.parse(localStorage.getItem('highlights') || '{}');
    const bms = JSON.parse(localStorage.getItem('bookmarks') || '[]');
    document.querySelectorAll('.verse').forEach(v => {
        const ref = refPrefix + v.id.split('-')[1];
        if (hls[ref]) {
            v.classList.add('highlighted');
            v.style.setProperty('--hl-color', hls[ref]);
        }
        if (bms.some(b => b.ref === ref)) {
            const marker = document.createElement('i');
            marker.className = 'fas fa-bookmark verse-marker';
            marker.style = "color:#f44336; font-size:0.8em; margin-right:5px;";
            v.prepend(marker);
        }
    });
}

function applyHighlight(color) {
    const ref = getSelectedRef();
    if (!ref) return;
    let hls = JSON.parse(localStorage.getItem('highlights') || '{}');
    if (hls[ref] === color) {
        delete hls[ref];
        selectedVerseEl?.classList.remove('highlighted');
    } else {
        hls[ref] = color;
        selectedVerseEl?.classList.add('highlighted');
        selectedVerseEl?.style.setProperty('--hl-color', color);
    }
    localStorage.setItem('highlights', JSON.stringify(hls));
    document.getElementById('highlight-colors')?.classList.add('hidden');
}

function openNoteModal() {
    const ref = getSelectedRef();
    if (!ref) return;
    const notes = JSON.parse(localStorage.getItem('notes') || '{}');
    const nText = document.getElementById('note-text');
    const nRefDisp = document.getElementById('note-ref-display');
    if (nRefDisp) nRefDisp.innerText = ref;
    if (nText) nText.value = notes[ref] || '';
    document.getElementById('notes-modal')?.classList.add('show');
}

function saveNote() {
    const ref = getSelectedRef();
    if (!ref) return;
    const nText = document.getElementById('note-text');
    if (!nText) return;
    const txt = nText.value;
    let notes = JSON.parse(localStorage.getItem('notes') || '{}');
    if (txt.trim()) notes[ref] = txt; else delete notes[ref];
    localStorage.setItem('notes', JSON.stringify(notes));
    document.getElementById('notes-modal')?.classList.remove('show');
}

function normalizeBookName(name) {
    if (!name) return '';
    const n = name.trim().toUpperCase();
    if (n === 'GUTEGEKA KWA KABIRI') return 'Gutegeka';
    if (n === 'INDIRIMBO ZA SALOMO') return 'Indirimbo';
    if (n === 'AMAGANYA YA YEREMIYA') return 'Amaganya';
    if (n === 'IBYAKOZWE N’INTUMWA') return 'Ibyakozwe';
    
    // Capitalize first letter of each word? Or just overall?
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

function buildBookGrid() {
    if (!bookGrid || !bibleData) return;
    bookGrid.innerHTML = '';
    const isGrid = appSettings.bookSelectMode === 'grid';
    
    if (isGrid) {
        bookGrid.classList.remove('layout-list');
        bookGrid.classList.add('grid');
    } else {
        bookGrid.classList.remove('grid');
        bookGrid.classList.add('layout-list');
    }

    bibleData.testaments.forEach(t => {
        if (!t) return;
        const h = document.createElement('div');
        h.className = 'grid-section';
        h.innerText = t.name || '';
        bookGrid.appendChild(h);
        
        t.books && t.books.forEach(b => {
            if (!b || !b.chapters || b.chapters.length === 0) return;
            const item = document.createElement('div');
            item.className = isGrid ? 'book-item' : 'search-result-item';
            
            if (isGrid) {
                item.innerText = bookAbbreviations[b.name] || (b.name ? b.name.substring(0, 3) : '...');
            } else {
                item.innerHTML = `<div class="result-ref">${b.name}</div>`;
            }
            
            item.onclick = () => selectBook(b);
            bookGrid.appendChild(item);
        });
    });
}

function selectBook(book) {
    if (!bibleData) return;
    const idx = bibleData.allBooks.findIndex(b => b.name === book.name);
    if (idx === -1) return;
    currentBookIndex = idx;
    
    renderChapterGrid(book);
    showModalTab('chapters');
}

function renderChapterGrid(book) {
    const chaptersGrid = document.getElementById('chapter-grid');
    if (!chaptersGrid) return;
    chaptersGrid.innerHTML = '';
    book.chapters && book.chapters.forEach((chap, cIdx) => {
        if (!chap) return;
        const item = document.createElement('div');
        item.className = 'chapter-item';
        item.innerText = chap.number || (cIdx + 1);
        item.onclick = () => selectChapter(cIdx);
        chaptersGrid.appendChild(item);
    });
}

function selectChapter(chapIdx) {
    if (!bibleData) return;
    currentChapterIndex = chapIdx;
    loadContent(currentBookIndex, chapIdx);
    closeModal();
}

function renderVerseGrid() {
    const vGrid = document.getElementById('verse-grid');
    if (!vGrid) return;
    vGrid.innerHTML = '';
    const book = bibleData.allBooks[currentBookIndex];
    const chapter = book.chapters[currentChapterIndex];
    
    if (chapter && chapter.content) {
        chapter.content.forEach((item) => {
            if (item && item.type === 'verse') {
                const el = document.createElement('div');
                el.className = 'verse-item';
                el.innerText = item.number;
                el.onclick = () => {
                    currentVerseNumber = item.number;
                    loadContent(currentBookIndex, currentChapterIndex);
                    closeModal();
                };
                vGrid.appendChild(el);
            }
        });
    }
}

function applyTheme() {
    document.body.className = appSettings.theme === 'dark' ? 'dark-theme' : 'light-theme';
}

function applyLayout() {
    if (chapterBody) {
        chapterBody.classList.remove('layout-para', 'layout-line');
        chapterBody.classList.add(`layout-${appSettings.layout}`);
    }
}

function closeModal() {
    if (selectionModal) selectionModal.classList.remove('show');
    showModalTab('books');
}

if (menuBtn) menuBtn.onclick = () => { drawer?.classList.add('open'); overlay?.classList.add('show'); };
if (overlay) overlay.onclick = closeDrawer;

const bookLabel = document.getElementById('current-book');
if (bookLabel) bookLabel.onclick = () => {
    showModalTab('books');
    selectionModal?.classList.add('show');
};

const chapLabel = document.getElementById('current-chapter');
if (chapLabel) chapLabel.onclick = () => {
    selectBook(bibleData.allBooks[currentBookIndex]);
    selectionModal?.classList.add('show');
};

const closeM = document.getElementById('close-modal');
if (closeM) closeM.onclick = closeModal;

function shareVerse() {
    const ref = getSelectedRef();
    if (!ref || !selectedVerseEl) return;
    const text = selectedVerseEl.innerText.replace(/^\d+/, '').trim();
    const shareText = `"${text}" - ${ref}`;
    if (navigator.share) {
        navigator.share({ title: 'Bibiliya Yera', text: shareText });
    } else {
        copyToClipboard(shareText, 'Umurongo wajyanywe!');
    }
}

function scheduleDailyNotification() {
    if (!appSettings.notifEnabled) return;
    if (Notification.permission !== 'granted') return;

    const [hrs, mins] = appSettings.notifTime.split(':').map(Number);
    const now = new Date();
    let scheduled = new Date();
    scheduled.setHours(hrs, mins, 0, 0);
    
    if (scheduled <= now) {
        scheduled.setDate(scheduled.getDate() + 1);
    }
    
    const diff = scheduled.getTime() - now.getTime();
    console.log(`Notification scheduled in ${Math.round(diff/1000/60)} minutes`);
    
    setTimeout(() => {
        showRandomVerseNotification();
        scheduleDailyNotification();
    }, diff);
}

function showRandomVerseNotification() {
    if (!bibleData) return;
    const all = bibleData.allBooks;
    const book = all[Math.floor(Math.random() * all.length)];
    const chap = book.chapters[Math.floor(Math.random() * book.chapters.length)];
    const verses = chap.content.filter(v => v.type === 'verse');
    const verse = verses[Math.floor(Math.random() * verses.length)];

    if (Notification.permission === 'granted') {
        new Notification("Umurongo w'uyu munsi", {
            body: `${book.name} ${chap.number}:${verse.number} - ${verse.text}`,
            icon: 'bible_cover_premium.png'
        });
    }
}

init();
window.addEventListener('online', () => {
    console.log('Online! Updating cache...');
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => reg.update());
    }
});
