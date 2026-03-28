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
    theme: 'light-theme',
    layout: 'paragraph',
    bookSelectMode: 'grid',
    notifTime: '08:00'
};

const bookAbbreviations = {
    "ITANGIRIRO": "Ita", "KUVA": "Kuv", "ABALEWI": "Lew", "KUBARA": "Guh", "GUTEGEKA KWA KABIRI": "Gus", "YOSUWA": "Yos",
    "ABACAMANZA": "Abac", "RUS I": "Rus", "1 NGO MA": "1Ngo", "2 NGO MA": "2Ngo", "EZ IRA": "Ezr", "NEHEMIYA": "Neh",
    "ES ITERI": "Est", "YOBU": "Yob", "ZABURI": "Zab", "IMIGANI": "Imig", "UMUBWIRIZA": "Umu", "INDIRIMBO ZA S ALO MO": "Ind",
    "Y ES AYA": "Yes", "Y EREMIYA": "Yer", "AMAGANYA YA Y EREMIYA": "Int", "EZ EKIY ELI": "Ezk", "DANIY ELI": "Dan",
    "HOS EYA": "Hos", "YOWELI": "Yow", "AMOS I": "Am", "OBADIYA": "Ob", "YONA": "Yon", "MIKA": "Mik", "NAHUMU": "Nah",
    "HABAKUKI": "Hab", "Z EFANIYA": "Zef", "HAGAY I": "Hag", "Z EKARIYA": "Zek", "MALAKI": "Mal",
    "MATAYO": "Mat", "MARIKO": "Mrk", "LUKA": "Luk", "YOHANA": "Yoh", "IBYAKOZWE N’INTUMWA": "Ivya", "ABARO MA": "Rom",
    "1 ABAKORINTO": "1Kor", "2 ABAKORINTO": "2Kor", "ABAGALATIYA": "Gal", "ABEF ESO": "Ef", "ABAF ILIPI": "Flp", "ABAKOLOS AY I": "Kol",
    "1 ABATES ALONIKE": "1Tes", "2 ABATES ALONIKE": "2Tes", "1 TIMOTEYO": "1Tim", "2 TIMOTEYO": "2Tim", "TITO": "Tit", "F ILEMONI": "Flm",
    "ABAHEBURAYO": "Heb", "YAKOBO": "Yak", "1 PETERO": "1Ptr", "2 PETERO": "2Ptr", "1 YOHANA": "1Yoh", "2 YOHANA": "2Yoh", "3 YOHANA": "3Yoh",
    "YUDA": "Yud", "IBYAHISHUWE": "Ibya"
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
        setupInteractions();
    } catch (err) {
        console.error("Init failed:", err);
    }
}

function loadSettings() {
    const saved = localStorage.getItem('appSettings');
    if (saved) {
        appSettings = { ...appSettings, ...JSON.parse(saved) };
    }
    // Apply theme
    document.body.className = appSettings.theme;
    
    // Set UI values
    const bibleSelect = document.getElementById('bible-select');
    if (bibleSelect) bibleSelect.value = appSettings.bible;
    
    const langSelect = document.getElementById('lang-select');
    if (langSelect) langSelect.value = appSettings.lang;
    
    const fontRange = document.getElementById('font-range');
    if (fontRange) fontRange.value = appSettings.fontSize;
    
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) themeSelect.value = appSettings.theme.replace('-theme', '');
    
    const layoutSelect = document.getElementById('layout-select');
    if (layoutSelect) layoutSelect.value = appSettings.layout;

    const bookModeSelect = document.getElementById('book-mode-select');
    if (bookModeSelect) bookModeSelect.value = appSettings.bookSelectMode;

    const notifTimeInput = document.getElementById('notif-time');
    if (notifTimeInput) notifTimeInput.value = appSettings.notifTime;

    updateFontDemo();
}

function saveSettings() {
    localStorage.setItem('appSettings', JSON.stringify(appSettings));
}

async function loadBible(version) {
    toggleLoading(true);
    try {
        const response = await fetch(`${version}/bibiliya.json`);
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
        alert(`Ntibishoboka gushika kuri Bibiliya ya ${version}.`);
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
        appSettings.theme = document.body.classList.contains('dark-theme') ? 'light-theme' : 'dark-theme';
        document.body.className = appSettings.theme;
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

    setE('notif-time', 'onchange', (e) => {
        appSettings.notifTime = e.target.value;
        saveSettings();
    });
    
    setE('theme-select', 'onchange', (e) => {
        appSettings.theme = e.target.value + '-theme';
        document.body.className = appSettings.theme;
        saveSettings();
    });
    
    setE('layout-select', 'onchange', (e) => {
        appSettings.layout = e.target.value;
        if (appSettings.layout === 'list') chapterBody?.classList.add('layout-list');
        else chapterBody?.classList.remove('layout-list');
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
            if (bibleData && bibleData.allBooks) {
                for (let bIdx = 0; bIdx < bibleData.allBooks.length; bIdx++) {
                    if (count >= 100) break;
                    const book = bibleData.allBooks[bIdx];
                    for (let cIdx = 0; cIdx < book.chapters.length; cIdx++) {
                        if (count >= 100) break;
                        const chap = book.chapters[cIdx];
                        if (!chap.content) continue;
                        for (const item of chap.content) {
                            if (item && item.type === 'verse' && item.text.toLowerCase().includes(q)) {
                                const div = document.createElement('div');
                                div.className = 'search-result-item';
                                div.innerHTML = `
                                    <div class="result-ref">${book.name} ${chap.number}:${item.number}</div>
                                    <div class="result-text">${item.text}</div>
                                `;
                                div.onclick = () => {
                                    currentVerseNumber = item.number;
                                    loadContent(bIdx, cIdx);
                                    document.getElementById('search-modal')?.classList.remove('show');
                                };
                                resultsContainer.appendChild(div);
                                count++;
                                if (count >= 100) break;
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
        if (appSettings.layout === 'list') chapterBody.classList.add('layout-list');
        else chapterBody.classList.remove('layout-list');

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
        list.innerHTML = '<div style="padding: 20px; text-align: center;">Nta mateka yabonetse.</div>';
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
        list.innerHTML = '<div style="padding: 20px; text-align: center;">Nta nyigisho n’imwe urandika.</div>';
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
        list.innerHTML = '<div style="padding: 20px; text-align: center;">Nta mirongo isize irangi yabonetse.</div>';
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
        list.innerHTML = '<div style="padding: 20px; text-align: center;">Nta ndanzi y’umurongo urabika.</div>';
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
    if (name === 'GUTEGEKA KWA KABIRI') return 'Gutegeka';
    if (name === 'INDIRIMBO ZA S ALO MO') return 'Indirimbo';
    return name.charAt(0) + name.slice(1).toLowerCase();
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
        const tName = t.name || '';
        h.innerText = tName.includes('RISHYA') || tName.includes('RISHA') ? 'ISEZERANO RISHA' : 'ISEZERANO RYA KERA';
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
    showModalTab('chapters');
    if (!chapterGrid) return;
    chapterGrid.innerHTML = '';
    book.chapters && book.chapters.forEach((chap, cIdx) => {
        if (!chap) return;
        const item = document.createElement('div');
        item.className = 'chapter-item';
        item.innerText = chap.number || (cIdx + 1);
        item.onclick = () => selectChapter(idx, cIdx);
        chapterGrid.appendChild(item);
    });
}

function selectChapter(bookIdx, chapIdx) {
    if (!bibleData) return;
    currentBookIndex = bookIdx;
    currentChapterIndex = chapIdx;
    const book = bibleData.allBooks[bookIdx];
    const chapter = book.chapters[chapIdx];
    
    // Switch to verses tab BEFORE populating
    showModalTab('verses');

    const vGrid = document.getElementById('verse-grid');
    if (!vGrid) return;
    vGrid.innerHTML = '';
    
    // Show local loading if grid is large
    const resultsContainer = document.getElementById('search-results');
    // Using a simple flag for verse grid loading or re-using the spinner logic
    vGrid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 20px;"><div class="spinner-small"></div></div>';
    setTimeout(() => {
        let vCount = 0;
        chapter.content && chapter.content.forEach(item => {
            if (item && item.type === 'verse') vCount++;
        });

        if (vCount === 0) vGrid.innerHTML = '<div style="grid-column: 1/-1; padding: 20px; text-align: center;">Nta mirongo yabonetse.</div>';
        for (let i = 1; i <= vCount; i++) {
            const item = document.createElement('div');
            item.className = 'verse-item';
            item.innerText = i;
            item.onclick = () => {
                currentVerseNumber = i;
                loadContent(bookIdx, chapIdx);
                closeModal();
            };
            vGrid.appendChild(item);
        }
        toggleLoading(false);
    }, 50);
}

function closeModal() {
    if (selectionModal) selectionModal.classList.remove('show');
    showModalTab('books');
}

if (menuBtn) menuBtn.onclick = () => { drawer?.classList.add('open'); overlay?.classList.add('show'); };
if (overlay) overlay.onclick = closeDrawer;
document.querySelectorAll('.selector-container').forEach(el => el.onclick = () => selectionModal?.classList.add('show'));
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

init();
