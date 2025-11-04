// Sabit veriler artık ayrı dosyalarda:
// - sabit-yemekbasliklari.js -> yemekBasliklari
// - sabit-menuler.js -> sabitMenuler
// NOT: sabit-urunler.js artık localStorage'de yönetiliyor

// Sabit Ürünler localStorage yönetimi
const SABIT_URUNLER_KEY = 'sabitUrunler';

// Default sabit ürünler artık sabit-urunler.js dosyasında tanımlı

// localStorage'dan sabit ürünleri yükle
function loadSabitUrunler() {
    try {
        const stored = localStorage.getItem(SABIT_URUNLER_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Sabit ürünler yüklenirken hata:', error);
    }
    return defaultSabitUrunler;
}

// localStorage'a sabit ürünleri kaydet
function saveSabitUrunler(sabitUrunler) {
    try {
        localStorage.setItem(SABIT_URUNLER_KEY, JSON.stringify(sabitUrunler));
        return true;
    } catch (error) {
        console.error('Sabit ürünler kaydedilirken hata:', error);
        return false;
    }
}

// Sabit ürünleri sıfırla (default değerlere dön)
function resetSabitUrunler() {
    return saveSabitUrunler(defaultSabitUrunler);
}

// Global sabit ürünler objesi
let sabitUrunler = loadSabitUrunler();

// Haftalık menü yapısı: { id, title, start, end, days, holidays, menus }
let weeklyMenus = [];
let selectedWeeklyMenuId = null;

function saveWeeklyMenus() {
    try {
        localStorage.setItem('weeklyMenus', JSON.stringify(weeklyMenus));
        localStorage.setItem('selectedWeeklyMenuId', selectedWeeklyMenuId);
    } catch (error) {
        console.error('localStorage kaydetme hatası:', error);
    }
}
function loadWeeklyMenus() {
    weeklyMenus = JSON.parse(localStorage.getItem('weeklyMenus') || '[]');
    selectedWeeklyMenuId = localStorage.getItem('selectedWeeklyMenuId') || null;
}



function renderWeeklyMenuSelect() {
    const select = $('#weekly-menu-select');
    select.empty();
    if (weeklyMenus.length === 0) {
        select.append('<option value="">Haftalık Menü Yok</option>');
        return;
    }
    weeklyMenus.forEach(menu => {
        const start = formatTurkishDate(menu.start);
        const end = formatTurkishDate(menu.end);
        select.append(`<option value="${menu.id}" ${menu.id === selectedWeeklyMenuId ? 'selected' : ''}>${menu.title} (${start} - ${end})</option>`);
    });
}

function getSelectedWeeklyMenu() {
    return weeklyMenus.find(m => m.id === selectedWeeklyMenuId);
}

let selectedDayIndex = 0;

// Seçili gün bilgisini kaydet/oku (menüye özel)
function saveSelectedDayIndex(menuId, dayIndex) {
    if (!menuId) return;
    localStorage.setItem('selectedDayIndex_' + menuId, dayIndex);
}
function loadSelectedDayIndex(menuId) {
    if (!menuId) return 0;
    const idx = localStorage.getItem('selectedDayIndex_' + menuId);
    return idx !== null ? Number(idx) : 0;
}

function renderMenuUI(dayIndex) {
    const menu = getSelectedWeeklyMenu();
    if (!menu) {
        $('#menu-date-range').text('');
        $('#days-buttons').html('');
        $('#day-detail').html('<div class="alert alert-info">Lütfen bir haftalık menü seçin veya ekleyin.</div>');
        return;
    }
    // Seçili gün bilgisini yükle
    if (typeof dayIndex === 'number' && dayIndex >= 0) {
        selectedDayIndex = dayIndex;
        saveSelectedDayIndex(menu.id, selectedDayIndex);
    } else {
        selectedDayIndex = loadSelectedDayIndex(menu.id);
    }
    if (typeof selectedDayIndex !== 'number' || selectedDayIndex < 0) {
        selectedDayIndex = 0;
    }
    let btns = '';
    menu.days.forEach((d, i) => {
        btns += `<button class="btn btn-outline-primary mx-1${i === selectedDayIndex ? ' active' : ''}" data-day="${i}">${d.name}</button>`;
    });
    const daysAndButtonsHtml = `
        <div class="d-flex justify-content-between w-100 align-items-start mb-4">
            <div class="days-section">
                ${btns}
            </div>
            <div class="buttons-section d-flex flex-row gap-2">
                <button id="export-daily-excel-btn" class="btn btn-gunluk">
                    Günlük Menü Excel Aktar
                </button>
                <button id="download-pptx-menu-btn" class="btn btn-success btn-lg">
                    Özel Oda Menü
                </button>
                <button id="export-weekly-excel-btn" class="btn btn-haftalik">
                    Haftalık Menüyü Excel'e Aktar
                </button>
                <button id="add-sabit-urunler-btn" class="btn btn-sabit">
                    Sabit Ürünleri Güncelle
                </button>
                <button id="menu-notes-btn" class="btn btn-outline-primary">
                    Menü Notları
                </button>
            </div>
        </div>
    `;
    $('#days-buttons').html(daysAndButtonsHtml);
    renderDayDetail(selectedDayIndex);

    // Yeni butonların event listener'larını ekle
    $('#add-sabit-urunler-btn').off('click').on('click', function () {
        const selectedId = $('#weekly-menu-select').val();
        if (!selectedId) {
            alert('Lütfen önce bir haftalık menü seçiniz!');
            return;
        }
        const menu = weeklyMenus.find(m => m.id === selectedId);
        if (!menu) return;

        showConfirmModal(`"${menu.title}" haftasındaki seçili güne sabit ürünleri eklemek istediğinize emin misiniz?`, function () {
            addSabitUrunlerToDay(menu, selectedDayIndex);
            saveWeeklyMenus();
            renderMenuUI();
        });
    });

    $('#export-weekly-excel-btn').off('click').on('click', async function () {
        const menu = getSelectedWeeklyMenu();
        if (!menu) {
            alert('Lütfen önce bir haftalık menü seçiniz!');
            return;
        }
        if (typeof ExcelJS === 'undefined') {
            alert('ExcelJS kütüphanesi yüklü değil!');
            return;
        }
        await exportWeeklyMenuToExcel(menu);
    });

    $('#export-daily-excel-btn').off('click').on('click', async function () {
        const menu = getSelectedWeeklyMenu();
        if (!menu) {
            alert('Lütfen önce bir haftalık menü seçiniz!');
            return;
        }
        if (typeof ExcelJS === 'undefined') {
            alert('ExcelJS kütüphanesi yüklü değil!');
            return;
        }
        await exportAllDailyMenusToExcel(menu);
    });

    // removed: export special menu button handler

    // Menü Notları butonu
    $('#menu-notes-btn').off('click').on('click', function () {
        const menu = getSelectedWeeklyMenu();
        if (!menu) {
            alert('Lütfen önce bir haftalık menü seçiniz!');
            return;
        }
        openMenuNotesModal(menu);
    });
}

// Açık olan collapse'ları tutan obje
enumOpenCollapses = {};

function renderDayDetail(dayIndex) {
    selectedDayIndex = dayIndex;
    const menu = getSelectedWeeklyMenu();
    if (!menu || !menu.days[dayIndex]) return;
    const day = menu.days[dayIndex];
    const isHoliday = menu.holidays[day.date] || false;
    // --- Tümünü Aç/Kapat butonu için kontrol ---
    const collapseIds = yemekBasliklari.map(baslik => getCollapseId(dayIndex, baslik));
    const allOpen = collapseIds.every(id => enumOpenCollapses[id]);
    const toggleText = allOpen ? 'Tüm Yemekleri Gizle' : 'Tüm Yemekleri Göster';
    let html = `<div class='menu-date-bar d-flex justify-content-between align-items-center'>
        <span class='date-span'>${formatTurkishDate(day.date)} / ${day.name}</span>
        <div class='d-flex align-items-center gap-3'>
            <span class='holiday-area'>
                <input type='checkbox' class='holiday-checkbox' id='holiday-${dayIndex}' ${isHoliday ? 'checked' : ''}>
                <label for='holiday-${dayIndex}' class='holiday-label'>Resmi Tatil</label>
            </span>
            <button type='button' class='btn btn-secondary btn-sm rounded-pill' id='toggle-all-collapses-btn' style='font-weight: 500;'>${toggleText}</button>
        </div>
    </div>`;
    for (let i = 0; i < yemekBasliklari.length; i += 3) {
        html += `<div class='row'>`;
        for (let j = i; j < i + 3 && j < yemekBasliklari.length; j++) {
            const baslik = yemekBasliklari[j];
            const menuListArr = (menu.menus[day.date]?.[baslik] || []);
            const menuList = menuListArr.map((item, idx) => {
                // 2 fiyat alanı gereken kategoriler
                const dualPriceCategories = ['Çorbalar', 'Ana Yemekler', 'Pilav / Makarna', 'Salata', 'Zeytinyağlılar', 'Soğuklar', 'Tatlılar'];
                const needsDualPrice = dualPriceCategories.includes(baslik);

                // 1. fiyat (Self, Dekanlık için)
                let fiyat1Display = '';
                if (!item.ad) {
                    fiyat1Display = '';
                } else if (item.fiyat !== undefined && item.fiyat !== null && item.fiyat !== '') {
                    if (typeof item.fiyat === 'number') {
                        fiyat1Display = item.fiyat.toFixed(2).replace('.', ',');
                    } else if (typeof item.fiyat === 'string') {
                        fiyat1Display = item.fiyat.replace('.', ',');
                    } else {
                        fiyat1Display = item.fiyat;
                    }
                } else {
                    fiyat1Display = '0,00';
                }

                // 2. fiyat (Alakart için) - eğer varsa
                let fiyat2Display = '';
                if (needsDualPrice) {
                    if (item.fiyat2 !== undefined && item.fiyat2 !== null && item.fiyat2 !== '') {
                        if (typeof item.fiyat2 === 'number') {
                            fiyat2Display = item.fiyat2.toFixed(2).replace('.', ',');
                        } else if (typeof item.fiyat2 === 'string') {
                            fiyat2Display = item.fiyat2.replace('.', ',');
                        } else {
                            fiyat2Display = item.fiyat2;
                        }
                    } else {
                        fiyat2Display = '';
                    }
                }

                let priceInputs = '';
                if (needsDualPrice) {
                    priceInputs = `
                        <div class='d-flex flex-column align-items-start gap-1'>
                            <label class='form-label mb-0' style='font-size: 0.85em;'>Self Fiyat</label>
                            <input type='text' class='menu-fiyat1-input form-control form-control-sm' value='${fiyat1Display}' data-baslik='${baslik}' data-day='${dayIndex}' data-index='${idx}' placeholder='0,00' style='width: 100px; min-width: 60px;'>
                        </div>
                        <div class='d-flex flex-column align-items-start gap-1'>
                            <label class='form-label mb-0' style='font-size: 0.85em;'>Alakart Fiyat</label>
                            <input type='text' class='menu-fiyat2-input form-control form-control-sm' value='${fiyat2Display}' data-baslik='${baslik}' data-day='${dayIndex}' data-index='${idx}' placeholder='0,00' style='width: 100px; min-width: 60px;'>
                        </div>
                    `;
                } else {
                    priceInputs = `
                        <div class='d-flex flex-column align-items-start gap-1'>
                            <label class='form-label mb-0' style='font-size: 0.85em;'>Fiyat</label>
                            <input type='text' class='menu-fiyat-input form-control form-control-sm' value='${fiyat1Display}' data-baslik='${baslik}' data-day='${dayIndex}' data-index='${idx}' placeholder='0,00' style='width: 120px; min-width: 60px;'>
                        </div>
                    `;
                }

                return `<li class='list-group-item d-flex justify-content-between align-items-center'>
                    <div class='d-flex flex-column align-items-start gap-1'>
                        <label class='form-label mb-0' style='font-size: 0.85em;'>Yemek Adı</label>
                        <input type='text' class='menu-ad-input form-control form-control-sm' value='${item.ad || ''}' data-baslik='${baslik}' data-day='${dayIndex}' data-index='${idx}' placeholder='Yemek adı'>
                    </div>
                    <div class='d-flex align-items-center gap-2'>
                        ${priceInputs}
                        <span class='delete-menu' data-baslik='${baslik}' data-day='${dayIndex}' data-index='${idx}' title='Sil' style='font-size:1em; cursor:pointer;'>&#10006;</span>
                    </div>
                </li>`;
            }).join('');
            const collapseId = getCollapseId(dayIndex, baslik);
            // Açık mı kontrolü
            const isOpen = enumOpenCollapses[collapseId];
            html += `
                <div class='col-md-4 mb-3'>
                    <div class='card mb-0${isHoliday ? ' holiday-day' : ''}'>
                        <div class='card-header fw-bold d-flex justify-content-between align-items-center card-collapse-header' data-bs-toggle='collapse' data-bs-target='#${collapseId}' style='cursor:pointer;'>
                            <span class='d-flex align-items-center'>
                                <span class='collapse-arrow me-2' data-target='#${collapseId}' style='font-size:1.2em;'>&#9654;</span>
                                ${baslik} <span class='menu-count'>(${menuListArr.length})</span>
                            </span>
                            <button class='btn btn-success btn-sm add-menu-btn' data-baslik='${baslik}' data-day='${dayIndex}' ${isHoliday ? 'disabled' : ''} tabindex='-1'>Ekle</button>
                        </div>
                        <div id='${collapseId}' class='collapse${isOpen ? ' show' : ''}'>
                            <div class='card-body p-2'>
                                <ul class='list-group list-group-flush'>${menuList}</ul>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        html += `</div>`;
    }
    html += `</div>`;
    $('#day-detail').html(html);

    // Collapse toggle (jQuery ile)
    $('.card-collapse-header').off('click').on('click', function (e) {
        if ($(e.target).closest('button, .add-menu-btn, .delete-menu').length > 0) return;
        const target = $(this).data('bs-target');
        const id = target.replace('#', '');
        // Toggle açık/kapalı durumunu kaydet
        enumOpenCollapses[id] = !enumOpenCollapses[id];
        $(target).collapse('toggle');
    });

    // Arrow yönünü güncelle
    $('.collapse').each(function () {
        const arrow = $(".collapse-arrow[data-target='#" + $(this).attr('id') + "']");
        if ($(this).hasClass('show')) {
            arrow.html('&#9660;'); // aşağı ok
        } else {
            arrow.html('&#9654;'); // sağ ok
        }
    });
    $('.collapse').on('show.bs.collapse', function () {
        const arrow = $(".collapse-arrow[data-target='#" + $(this).attr('id') + "']");
        arrow.html('&#9660;');
        enumOpenCollapses[$(this).attr('id')] = true;
    });
    $('.collapse').on('hide.bs.collapse', function () {
        const arrow = $(".collapse-arrow[data-target='#" + $(this).attr('id') + "']");
        arrow.html('&#9654;');
        enumOpenCollapses[$(this).attr('id')] = false;
    });

    // Global helper fonksiyonları kullanarak event listener'ları ekle

    // Fiyat input validasyonları
    addPriceValidation('.menu-fiyat-input');
    addPriceValidation('.menu-fiyat1-input');
    addPriceValidation('.menu-fiyat2-input');

    // Enter navigation - Yemek adından fiyat inputlarına
    addEnterNavigation('.menu-ad-input', '.menu-fiyat1-input, .menu-fiyat-input');

    // Enter navigation - 1. fiyattan 2. fiyata veya sonraki yemek adına
    $('#day-detail').off('keydown', '.menu-fiyat1-input').on('keydown', '.menu-fiyat1-input', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const fiyat2Input = $(this).closest('li').find('.menu-fiyat2-input');
            if (fiyat2Input.length) {
                fiyat2Input.focus();
                fiyat2Input.select();
            } else {
                // 2. fiyat yoksa sonraki yemek adına geç
                const nextLi = $(this).closest('li').next('li');
                if (nextLi.length) {
                    const nextAdInput = nextLi.find('.menu-ad-input');
                    if (nextAdInput.length) {
                        nextAdInput.focus();
                        nextAdInput.select();
                    }
                }
            }
        }
    });

    // Enter navigation - diğer fiyat inputlarından sonraki yemek adına
    addEnterNavigationToNext('.menu-fiyat-input', '.menu-ad-input');
    addEnterNavigationToNext('.menu-fiyat2-input', '.menu-ad-input');

    // Tümünü Aç/Kapat butonu event
    $('#toggle-all-collapses-btn').off('click').on('click', function () {
        const open = !collapseIds.every(id => enumOpenCollapses[id]);
        collapseIds.forEach(id => {
            enumOpenCollapses[id] = open;
            const $collapse = $('#' + id);
            if (open) {
                $collapse.collapse('show');
            } else {
                $collapse.collapse('hide');
            }
        });
        // Buton metnini güncelle
        const newText = open ? 'Tüm Yemekleri Gizle' : 'Tüm Yemekleri Göster';
        $(this).text(newText);
    });

    // Fiyat input event listener'ları - her renderDayDetail'de yeniden ekle
    // Normal fiyat input (tek fiyat alanı olanlar için)
    $('#day-detail').off('input', '.menu-fiyat-input').on('input', '.menu-fiyat-input', function () {
        const baslik = $(this).data('baslik');
        const dayIndex = $(this).data('day');
        const idx = $(this).data('index');
        const menu = getSelectedWeeklyMenu();
        const day = menu.days[dayIndex];

        console.log('Fiyat input değişikliği:', { baslik, dayIndex, idx, value: $(this).val() });

        if (!menu.menus[day.date] || !menu.menus[day.date][baslik] || !Array.isArray(menu.menus[day.date][baslik]) || !menu.menus[day.date][baslik][idx]) {
            console.error('Fiyat için menü yapısı bulunamadı');
            return;
        }

        let fiyat = $(this).val().replace(',', '.');
        if (fiyat === '') {
            fiyat = '';
        } else {
            fiyat = parseFloat(fiyat);
            if (isNaN(fiyat)) {
                fiyat = '';
            }
        }
        menu.menus[day.date][baslik][idx].fiyat = fiyat;
        console.log('Fiyat kaydedildi:', menu.menus[day.date][baslik][idx]);
        saveWeeklyMenus();
        console.log('Fiyat localStorage kaydedildi');
    });

    // 1. fiyat input (Self, Dekanlık için)
    $('#day-detail').off('input', '.menu-fiyat1-input').on('input', '.menu-fiyat1-input', function () {
        const baslik = $(this).data('baslik');
        const dayIndex = $(this).data('day');
        const idx = $(this).data('index');
        const menu = getSelectedWeeklyMenu();
        const day = menu.days[dayIndex];

        console.log('1. Fiyat input değişikliği:', { baslik, dayIndex, idx, value: $(this).val() });

        if (!menu.menus[day.date] || !menu.menus[day.date][baslik] || !Array.isArray(menu.menus[day.date][baslik]) || !menu.menus[day.date][baslik][idx]) {
            console.error('1. Fiyat için menü yapısı bulunamadı');
            return;
        }

        let fiyat = $(this).val().replace(',', '.');
        if (fiyat === '') {
            fiyat = '';
        } else {
            fiyat = parseFloat(fiyat);
            if (isNaN(fiyat)) {
                fiyat = '';
            }
        }
        menu.menus[day.date][baslik][idx].fiyat = fiyat;
        console.log('1. Fiyat kaydedildi:', menu.menus[day.date][baslik][idx]);
        saveWeeklyMenus();
        console.log('1. Fiyat localStorage kaydedildi');
    });

    // 2. fiyat input (Alakart için)
    $('#day-detail').off('input', '.menu-fiyat2-input').on('input', '.menu-fiyat2-input', function () {
        const baslik = $(this).data('baslik');
        const dayIndex = $(this).data('day');
        const idx = $(this).data('index');
        const menu = getSelectedWeeklyMenu();
        const day = menu.days[dayIndex];

        console.log('2. Fiyat input değişikliği:', { baslik, dayIndex, idx, value: $(this).val() });

        if (!menu.menus[day.date] || !menu.menus[day.date][baslik] || !Array.isArray(menu.menus[day.date][baslik]) || !menu.menus[day.date][baslik][idx]) {
            console.error('2. Fiyat için menü yapısı bulunamadı');
            return;
        }

        let fiyat = $(this).val().replace(',', '.');
        if (fiyat === '') {
            fiyat = '';
        } else {
            fiyat = parseFloat(fiyat);
            if (isNaN(fiyat)) {
                fiyat = '';
            }
        }
        menu.menus[day.date][baslik][idx].fiyat2 = fiyat;
        console.log('2. Fiyat kaydedildi:', menu.menus[day.date][baslik][idx]);
        saveWeeklyMenus();
        console.log('2. Fiyat localStorage kaydedildi');
    });
}

function showConfirmModal(message, callback) {
    $('#confirmModalBody').text(message);
    $('#confirmModal').modal('show');
    $('#confirmModalOk').off('click').on('click', function () {
        $('#confirmModal').modal('hide');
        callback();
    });
}

// Menü notları modalını aç
function openMenuNotesModal(menu) {
    // Mevcut notları form alanlarına yükle
    sabitMenuler.forEach(menuType => {
        const textarea = $(`#menu-notes-form textarea[name="${menuType.key}"]`);
        const note = menu.menuNotes && menu.menuNotes[menuType.key] ? menu.menuNotes[menuType.key] : '';
        textarea.val(note);
    });
    // Modal başlığını güncelle
    $('#menuNotesModalLabel').text(`Menü Notları Düzenle - ${menu.title}`);
    // Modalı aç
    $('#menuNotesModal').modal('show');
}

// Menü notlarını kaydet
function saveMenuNotes(menu) {
    if (!menu.menuNotes) {
        menu.menuNotes = {};
    }
    // Form alanlarından notları al
    sabitMenuler.forEach(menuType => {
        const textarea = $(`#menu-notes-form textarea[name="${menuType.key}"]`);
        menu.menuNotes[menuType.key] = textarea.val().trim();
    });
    // localStorage'a kaydet
    saveWeeklyMenus();
    // Modalı kapat
    $('#menuNotesModal').modal('hide');
}

// Tüm eklenmiş yemek adlarını unique olarak topla
function getAllMenuNames() {
    const names = new Set();
    weeklyMenus.forEach(menu => {
        Object.values(menu.menus || {}).forEach(dayMenus => {
            Object.values(dayMenus || {}).forEach(list => {
                (list || []).forEach(item => {
                    if (item.ad) names.add(item.ad);
                });
            });
        });
    });
    return Array.from(names);
}

// Yardımcı: Belirli başlık için o başlıkta daha önce eklenmiş ürünleri unique olarak döndür
function getUniqueMenuNamesForBaslik(baslik) {
    const names = new Set();
    weeklyMenus.forEach(menu => {
        Object.values(menu.menus || {}).forEach(dayMenus => {
            if (dayMenus[baslik]) {
                (dayMenus[baslik] || []).forEach(item => {
                    if (item.ad) names.add(item.ad);
                });
            }
        });
    });
    return Array.from(names);
}

// Yardımcı fonksiyon: collapse id üret
function getCollapseId(dayIndex, baslik) {
    // Türkçe karakterleri ve boşlukları normalize et
    return 'collapse-' + dayIndex + '-' + baslik.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Sabit ürünleri belirli bir haftalık menüye ekle
function addSabitUrunlerToMenu(menu) {
    if (!menu || !menu.menus) return;

    // Her gün için sabit ürünleri ekle/güncelle
    menu.days.forEach(day => {
        if (!menu.menus[day.date]) menu.menus[day.date] = {};

        // Global helper fonksiyonu kullanarak kategorilere sabit ürünleri ekle
        addSabitUrunToCategory(menu, day.date, 'Zeytinyağlılar', sabitUrunler.zeytinyaglilar);
        addSabitUrunToCategory(menu, day.date, 'Soğuklar', sabitUrunler.soguklar);
        addSabitUrunToCategory(menu, day.date, 'Ekmekler', sabitUrunler.ekmekler);
        addSabitUrunToCategory(menu, day.date, 'İçecekler', sabitUrunler.icecekler);
        addSabitUrunToCategory(menu, day.date, 'Izgaralar', sabitUrunler.izgaralar);
        addSabitUrunToCategory(menu, day.date, 'Pideler', sabitUrunler.pideler);
    });
}

// Sabit ürünleri sadece seçili güne ekle
function addSabitUrunlerToDay(menu, dayIndex) {
    if (!menu || !menu.menus || typeof dayIndex !== 'number') return;
    const day = menu.days[dayIndex];
    if (!day) return;
    if (!menu.menus[day.date]) menu.menus[day.date] = {};

    // Global helper fonksiyonu kullanarak kategorilere sabit ürünleri ekle
    addSabitUrunToCategory(menu, day.date, 'Zeytinyağlılar', sabitUrunler.zeytinyaglilar);
    addSabitUrunToCategory(menu, day.date, 'Soğuklar', sabitUrunler.soguklar);
    addSabitUrunToCategory(menu, day.date, 'Ekmekler', sabitUrunler.ekmekler);
    addSabitUrunToCategory(menu, day.date, 'İçecekler', sabitUrunler.icecekler);
    addSabitUrunToCategory(menu, day.date, 'Izgaralar', sabitUrunler.izgaralar);
    addSabitUrunToCategory(menu, day.date, 'Pideler', sabitUrunler.pideler);
}

// ExcelJS ile haftalık menüyü görseldeki gibi: Her gün bir sütun, alt alta kategori başlıkları ve yemekler olacak şekilde kutulu ve renkli aktar (tam görsel uyumlu)
async function exportWeeklyMenuToExcel(menu) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Haftalık Menü');

    // Kategoriler ve başlıklar artık yemekBasliklari dizisinden alınacak
    // 'İçecekler' ve 'Ekmekler' ve 'Izgaralar' hariç olacak (tüm varyasyonlar için)
    const kategoriler = yemekBasliklari
        .filter(baslik => {
            const b = baslik.toLocaleLowerCase('tr-TR');
            return !b.includes('içecek') && !b.includes('ekmek') && !b.includes('ızgara') && !b.includes('pide');
        })
        .map(baslik => ({ ad: baslik.toLocaleUpperCase('tr-TR'), baslik }));

    const gunler = menu.days.map(d => d.name.toUpperCase());
    const gunCount = gunler.length;
    const colCount = gunCount;
    const lastCol = String.fromCharCode(65 + colCount - 1);

    // Border kalınlığı
    const borderStyle = { style: 'medium' };

    // 1. Satır: Başlık (merge)
    sheet.mergeCells(`A1:${lastCol}1`);
    sheet.getCell('A1').value = 'SOSYAL TESİS YEMEK MENÜSÜ';
    sheet.getCell('A1').font = { name: 'Arial Black', bold: true, size: 70 };
    sheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell('A1').border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle };
    // Arka plan rengi yok
    sheet.getRow(1).height = 100;

    // 2. Satır: Tarih aralığı (merge)
    sheet.mergeCells(`A2:${lastCol}2`);
    sheet.getCell('A2').value = `${formatTurkishDate(menu.start)} - ${formatTurkishDate(menu.end)}`;
    sheet.getCell('A2').font = { name: 'Arial Black', bold: true, size: 55 };
    sheet.getCell('A2').alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell('A2').border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle };
    // Arka plan rengi yok
    sheet.getRow(2).height = 85;

    // 3. Satır: Gün başlıkları
    sheet.addRow(gunler);
    const gunRow = sheet.getRow(3);
    gunRow.font = { name: 'Arial Black', bold: true, size: 48 };
    gunRow.alignment = { vertical: 'middle', horizontal: 'center' };
    gunRow.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC4BD97' } };
        cell.border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle };
    });
    gunRow.height = 85;

    // Her gün için alt alta kategori başlıkları ve yemekler
    // Her sütun bir gün olacak, satırlar: kategori başlığı, yemekler, kategori başlığı, yemekler...
    // En fazla yemek sayısını bul (her kategori için)
    let maxYemekCounts = kategoriler.map(kat => {
        let max = 1;
        menu.days.forEach(day => {
            const items = (menu.menus[day.date]?.[kat.baslik] || []);
            if (kat.baslik === 'Tatlılar') {
                // Tatlılar için maksimum 2 satır göster
                if (items.length > max) max = Math.min(items.length, 2);
            } else {
                if (items.length > max) max = items.length;
            }
        });
        // Tatlılar için maksimum 2 sat (
        if (kat.baslik === 'Tatlılar') return 2;
        return max;
    });
    // Her gün için toplam satır: kategori başlıkları + yemek satırları
    let totalRows = kategoriler.reduce((acc, kat, i) => acc + 1 + maxYemekCounts[i], 0);

    // Satırları oluştur
    let rowPointer = 4;
    // Resmi tatil günleri için sütun ve satır aralığını topla
    const holidayCols = {};
    for (let col = 1; col <= gunCount; col++) {
        const day = menu.days[col - 1];
        if (menu.holidays[day.date]) {
            // Çorbalar başlığından başlayıp, son satıra kadar merge edilecek
            holidayCols[col] = true;
        }
    }
    // Toplam satır sayısını önceden hesapla
    let totalSatir = kategoriler.reduce((acc, kat, i) => acc + 1 + maxYemekCounts[i], 0);
    let mergeStart = 4;
    let mergeEnd = 4 + totalSatir - 1;

    for (let katIdx = 0; katIdx < kategoriler.length; katIdx++) {
        // Kategori başlık satırı
        const row = sheet.getRow(rowPointer);
        for (let col = 1; col <= gunCount; col++) {
            if (holidayCols[col]) {
                // Sadece ilk kategori ve ilk yemek satırında merge işlemi yapılacak
                if (katIdx === 0) {
                    sheet.mergeCells(`${String.fromCharCode(64 + col)}${mergeStart}:${String.fromCharCode(64 + col)}${mergeEnd}`);
                    row.getCell(col).value = 'RESMİ TATİL'.split('').join('\n');
                    row.getCell(col).font = { name: 'Arial Black', bold: true, size: 80 };
                    row.getCell(col).alignment = {
                        vertical: 'middle',
                        horizontal: 'center',
                        wrapText: true
                    };
                    row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC4BD97' } };
                    row.getCell(col).border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle };
                }
                // Diğer hücrelere değer yazma
            } else {
                row.getCell(col).value = kategoriler[katIdx].ad;
                row.getCell(col).font = { name: 'Arial Black', bold: true, size: 28 };
                row.getCell(col).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                row.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC4BD97' } };
                row.getCell(col).border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle };
            }
        }
        rowPointer++;
        // Yemek satırları
        for (let yemekSatir = 0; yemekSatir < maxYemekCounts[katIdx]; yemekSatir++) {
            const yemekRow = sheet.getRow(rowPointer);
            for (let col = 1; col <= gunCount; col++) {
                if (holidayCols[col]) {
                    // Merge işlemi zaten yapıldı, bu hücrelere değer yazma
                    continue;
                }
                const day = menu.days[col - 1];
                const items = (menu.menus[day.date]?.[kategoriler[katIdx].baslik] || []);
                if (yemekSatir < items.length) {
                    yemekRow.getCell(col).value = (items[yemekSatir].ad || '').toLocaleUpperCase('tr-TR');
                } else {
                    yemekRow.getCell(col).value = '';
                }
                yemekRow.getCell(col).font = { name: 'Arial Black', size: 22, bold: true };
                yemekRow.getCell(col).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
                yemekRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
                yemekRow.getCell(col).border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle };
            }
            rowPointer++;
        }
        row.height = 85;
    }

    // Sütun genişlikleri
    for (let i = 1; i <= gunCount; i++) {
        sheet.getColumn(i).width = 65;
    }

    // Satır yükseklikleri (daha iyi görünüm için)
    for (let i = 1; i < rowPointer; i++) {
        sheet.getRow(i).height = 85;
    }

    // Sayfa çıktısı A4'e sığacak şekilde ayarlanıyor
    sheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        horizontalCentered: true, // Yatay ortalama
        verticalCentered: true, // Dikey ortalama
        margins: {
            left: 0.4724, // 1.2 cm
            right: 0.4724, // 1.2 cm
            top: 0.4724, // 1.2 cm
            bottom: 0.4724, // 1.2 cm
            header: 0.1,
            footer: 0.1
        }
    };

    // Başlık ve tarih satırı borderları da kalın olsun
    sheet.getCell('A1').border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle };
    sheet.getCell('A2').border = { top: borderStyle, left: borderStyle, bottom: borderStyle, right: borderStyle };

    // Dosyayı indir
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${menu.title}-haftalik-menu.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Tüm menü tiplerini tek Excel dosyasında, her biri ayrı sayfa olacak şekilde aktarır
async function exportAllDailyMenusToExcel(menu) {
    const workbook = new ExcelJS.Workbook();
    const gunIndex = typeof selectedDayIndex === 'number' ? selectedDayIndex : 0;
    const day = menu.days[gunIndex];
    const dateStr = `${formatTurkishDate(day.date)} ${day.name}`;
    const gunMenus = menu.menus[day.date] || {};

    // Self Menüleri
    createSelfMenuSheet(workbook, gunMenus, dateStr, menu, day);
    createYemekEtiketSheet(workbook, gunMenus, dateStr, menu);
    createMezelerSheet(workbook, gunMenus, dateStr, menu);
    createIceceklerSheet(workbook, gunMenus, dateStr, menu);

    // Alakart Menüleri
    createAlakartMenuSheet(workbook, gunMenus, dateStr, 'dikey', menu);
    createAlakartMenuSheet(workbook, gunMenus, dateStr, 'yatay', menu);

    // Dekanlık ve Pide Menü
    createDekanlikMenuSheet(workbook, gunMenus, dateStr, menu);
    createPideMenuSheetYatay(workbook, gunMenus, dateStr, menu);
    // createSpecialMenuSheet(workbook, gunMenus, dateStr, menu, day);

    // Dosyayı indir
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${menu.title}-${day.name}-gunluk-menuler.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// removed: exportSpecialMenuAsImage
/*
async function exportSpecialMenuAsImage(menu) {
    const gunIndex = typeof selectedDayIndex === 'number' ? selectedDayIndex : 0;
    const day = menu.days[gunIndex];
    const gunMenus = menu.menus[day.date] || {};

    // Menü içeriğini oluştur
    createMenuImageContent(gunMenus);

    // HTML2Canvas ile görsel oluştur
    try {
        const container = document.getElementById('menu-image-container');
        const canvas = await html2canvas(container, {
            width: 900,
            height: 1200,
            scale: 2, // Yüksek kalite için
            backgroundColor: '#ffffff',
            useCORS: false,
            allowTaint: true,
            foreignObjectRendering: false,
            imageTimeout: 0,
            removeContainer: false
        });

        // Canvas'ı blob'a çevir
        canvas.toBlob(function (blob) {
            // Dosyayı indir
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `${menu.title}-${day.name}-ozel-menu.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }, 'image/jpeg', 0.95);
    } catch (error) {
        console.error('Görsel oluşturma hatası:', error);
        alert('Görsel oluşturulurken bir hata oluştu!');
    }
}
*/

// removed: createMenuImageContent
/*
function createMenuImageContent(gunMenus) {
    const container = document.getElementById('menu-items-container');

    // Menü kategorileri ve yemekler
    const categories = [
        { name: 'ÇORBA', items: gunMenus['Çorbalar'] || [] },
        { name: 'SALATA', items: filterForMenuType(gunMenus['Salata'] || [], 'gorsel') },
        { name: 'ANA YEMEK', items: gunMenus['Ana Yemekler'] || [] },
        { name: 'TATLI', items: gunMenus['Tatlılar'] || [] }
    ];

    let html = '';

    categories.forEach(category => {
        if (category.items.length > 0) {
            // Kategori başlığı
            html += `<div class="menu-category-container">
                <h2 class="menu-category-title">*${category.name}*</h2>`;

            // Kategori altındaki yemekler
            category.items.forEach(item => {
                const itemName = item.ad || item.name || item;
                html += `<p class="menu-item-text">${itemName}</p>`;
            });

            html += '</div>';
        }
    });

    // Eğer hiç yemek yoksa varsayılan menüyü göster
    if (!html) {
        const defaultMenu = [
            { name: 'ÇORBA', items: ['TARHANA ÇORBASI'] },
            { name: 'SALATA', items: ['MEVSİM SALATA'] },
            { name: 'ANA YEMEK', items: ['KURU FASULYE', 'FIRINDA TAVUK KANAT', 'HASAN PAŞA KÖFTE'] },
            { name: 'TATLI', items: ['KAVUN', 'KARPUZ', 'TRİLİÇE'] }
        ];

        defaultMenu.forEach(category => {
            html += `<div class="menu-category-container">
                <h2 class="menu-category-title">*${category.name}*</h2>`;

            category.items.forEach(item => {
                html += `<p class="menu-item-text">${item}</p>`;
            });

            html += '</div>';
        });
    }

    container.innerHTML = html;
}
*/

// Pide Menü Yatay Excel çıktısı (sheet008.htm örneği gibi)
function createPideMenuSheetYatay(workbook, gunMenus, dateStr, menu) {
    const sheet = workbook.addWorksheet('Pide Menü (3)');

    // Sütun genişlikleri - yatay düzen için optimize edilmiş
    sheet.columns = [
        { width: 90 },  // Pide adları için geniş sütun
        { width: 25 },  // Pide fiyatları için
        { width: 22 },  // Boşluk
        { width: 90 },  // İçecek ve Salata adları için geniş sütun
        { width: 25 }   // İçecek ve Salata fiyatları için
    ];

    // Stil tanımları
    const fontHeader = { name: 'Arial Black', size: 28, bold: true, color: { argb: 'FF000000' } };
    const fontSubHeader = { name: 'Arial Black', size: 28, bold: true, color: { argb: 'FF000000' } };
    const fontCategory = { name: 'Arial Black', size: 26, bold: true, color: { argb: 'FF000000' } };
    const fontCell = { name: 'Arial Black', size: 24, color: { argb: 'FF000000' } };
    const fontNotes = { name: 'Arial Black', size: 14, bold: true, color: { argb: 'FF000000' } };
    const fontHours = { name: 'Arial Black', size: 18, bold: true, color: { argb: 'FF000000' } };
    const borderThick = { style: 'thick', color: { argb: 'FF000000' } };
    const fillGreen = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
    const fillLightGray = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };

    let row = 1;

    // 1. Satır: Ana başlık - BEYTEPE SOSYAL TESİS
    sheet.mergeCells(`A${row}:E${row}`);
    sheet.getCell(`A${row}`).value = 'BEYTEPE SOSYAL TESİS MÜDÜRLÜĞÜ';
    sheet.getCell(`A${row}`).font = fontHeader;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(row).height = 45;
    row++;

    // 2. Satır: PİDE SALONU
    sheet.mergeCells(`A${row}:E${row}`);
    sheet.getCell(`A${row}`).value = 'PİDE SALONU';
    sheet.getCell(`A${row}`).font = fontSubHeader;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(row).height = 40;
    row++;

    // 3. Satır: Tarih
    sheet.mergeCells(`A${row}:E${row}`);
    sheet.getCell(`A${row}`).value = dateStr;
    sheet.getCell(`A${row}`).font = fontSubHeader;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(row).height = 40;
    row++;

    // 4. Satır: Boşluk
    row++;

    // 5. Satır: Kategori başlıkları
    sheet.getCell(`A${row}`).value = 'PİDELERİMİZ';
    sheet.getCell(`A${row}`).font = fontCategory;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`A${row}`).fill = fillGreen;
    sheet.mergeCells(`A${row}:B${row}`);

    sheet.getCell(`D${row}`).value = 'İÇECEKLER';
    sheet.getCell(`D${row}`).font = fontCategory;
    sheet.getCell(`D${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`D${row}`).fill = fillGreen;
    sheet.mergeCells(`D${row}:E${row}`);

    sheet.getRow(row).height = 35;
    row++;

    // Pide menüsü verilerini al
    const pideler = gunMenus['Pideler'] || [];
    const icecekler = gunMenus['İçecekler'] || [];
    const salatalar = gunMenus['Salata'] || [];

    // Eğer menüde yoksa sabit ürünlerden al
    const sabitPideler = sabitUrunler.pideler || [];
    const sabitIcecekler = sabitUrunler.icecekler || [];

    const finalPideler = pideler.length > 0 ? pideler : sabitPideler;

    // Pide menüsü için sadece belirli içecekleri filtrele
    const pideIceceklerListesi = [
        'AYRAN 300 GR',
        'FANTA KUTU',
        'GAZOZ KUTU',
        'KOLA KUTU',
        'KOLA KUTU ZERO',
        'MEYVE SUYU KUTU',
        'SODA MEYVELİ',
        'SODA SADE',
        'SOĞUK ÇAY KUTU',
        'SU 0,5 LT',
        'ŞALGAM'
    ];

    const tumIcecekler = icecekler.length > 0 ? icecekler : sabitIcecekler;
    const finalIcecekler = tumIcecekler.filter(icecek =>
        pideIceceklerListesi.includes(icecek.ad.toUpperCase())
    );

    const finalSalatalar = filterForMenuType(salatalar, 'pide'); // Sadece menüden al, sabit yok


    // Maksimum satır sayısını hesapla
    const maxRows = Math.max(finalPideler.length, finalIcecekler.length, finalSalatalar.length, 12);

    // İçerik satırları
    for (let i = 0; i < maxRows; i++) {
        // Pide satırı
        if (finalPideler[i]) {
            sheet.getCell(`A${row}`).value = finalPideler[i].ad.toLocaleUpperCase('tr-TR');
            sheet.getCell(`A${row}`).font = fontCell;
            sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

            formatFiyatCellForExcel(sheet.getCell(`B${row}`), finalPideler[i].fiyat, finalPideler[i].ad);
            sheet.getCell(`B${row}`).font = fontCell;
            sheet.getCell(`B${row}`).alignment = { vertical: 'middle', horizontal: 'right' };
        }

        // İçecek satırı
        if (finalIcecekler[i]) {
            sheet.getCell(`D${row}`).value = finalIcecekler[i].ad.toLocaleUpperCase('tr-TR');
            sheet.getCell(`D${row}`).font = fontCell;
            sheet.getCell(`D${row}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

            formatFiyatCellForExcel(sheet.getCell(`E${row}`), finalIcecekler[i].fiyat, finalIcecekler[i].ad);
            sheet.getCell(`E${row}`).font = fontCell;
            sheet.getCell(`E${row}`).alignment = { vertical: 'middle', horizontal: 'right' };
        }

        sheet.getRow(row).height = 35;
        row++;
    }

    // SALATA başlığı (İçecekler bittikten sonra)
    sheet.getCell(`D${row}`).value = 'SALATA';
    sheet.getCell(`D${row}`).font = fontCategory;
    sheet.getCell(`D${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`D${row}`).fill = fillGreen;
    sheet.mergeCells(`D${row}:E${row}`);
    sheet.getRow(row).height = 35;
    row++;

    // Salata içeriği
    for (let i = 0; i < finalSalatalar.length; i++) {
        if (finalSalatalar[i]) {
            sheet.getCell(`D${row}`).value = finalSalatalar[i].ad.toLocaleUpperCase('tr-TR');
            sheet.getCell(`D${row}`).font = fontCell;
            sheet.getCell(`D${row}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

            formatFiyatCellForExcel(sheet.getCell(`E${row}`), finalSalatalar[i].fiyat, finalSalatalar[i].ad);
            sheet.getCell(`E${row}`).font = fontCell;
            sheet.getCell(`E${row}`).alignment = { vertical: 'middle', horizontal: 'right' };
        }
        sheet.getRow(row).height = 35;
        row++;
    }

    // Sol taraftaki notu kaldır - gerek yok
    row++;

    // AFİYET OLSUN yazısı (C sütununda dikey olarak)
    const afiyetStartRow = 6; // Kategori başlıklarından sonra
    const afiyetEndRow = row - 1;

    // C sütununu birleştir ve dikey yazı yerleştir
    sheet.mergeCells(`C${afiyetStartRow}:C${afiyetEndRow}`);
    sheet.getCell(`C${afiyetStartRow}`).value = 'A\nF\nİ\nY\nE\nT\n\nO\nL\nS\nU\nN';
    sheet.getCell(`C${afiyetStartRow}`).font = { name: 'Arial Black', size: 20, bold: true, color: { argb: 'FF000000' } };
    sheet.getCell(`C${afiyetStartRow}`).alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true
    };

    // Alt bilgi bölümü (ortada birleştirilmiş - menü notlarından alınan)
    const startInfoRow = row + 3;

    // UI'dan pide menü notlarını al
    const pideNotes = menu.menuNotes && menu.menuNotes.pide ? menu.menuNotes.pide : '';

    // Eğer UI'dan not yoksa varsayılan notları kullan
    let infoText = '';
    if (pideNotes && pideNotes.trim()) {
        infoText = pideNotes;
    } else {
        // Varsayılan notlar (görseldeki gibi)
        infoText = 'ÖĞRENCİYE 2\'DEN FAZLA PİDE SATIŞIMIZ YOKTUR.\n\nÇALIŞMA SAATLERİ\n11:30-14:00\n16:30-20:00';
    }

    // Ortada birleştirilmiş bilgi mesajı
    sheet.getCell(`A${startInfoRow}`).value = infoText;
    sheet.getCell(`A${startInfoRow}`).font = { name: 'Arial Black', size: 26, bold: true, color: { argb: 'FF000000' } };
    sheet.getCell(`A${startInfoRow}`).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    sheet.mergeCells(`A${startInfoRow}:E${startInfoRow + 15}`); // Tüm genişlikte 9 satır yüksekliğinde birleştir

    // Dış çerçeve ekle (sadece kenarlarda)
    const lastRow = startInfoRow + 6; // Alt bilgi bölümünün son satırı

    // Üst çerçeve (1. satır)
    sheet.getCell('A1').border = { top: borderThick };
    sheet.getCell('B1').border = { top: borderThick };
    sheet.getCell('C1').border = { top: borderThick };
    sheet.getCell('D1').border = { top: borderThick };
    sheet.getCell('E1').border = { top: borderThick };

    // Alt çerçeve (son satır)
    sheet.getCell(`A${lastRow}`).border = { bottom: borderThick };
    sheet.getCell(`B${lastRow}`).border = { bottom: borderThick };
    sheet.getCell(`C${lastRow}`).border = { bottom: borderThick };
    sheet.getCell(`D${lastRow}`).border = { bottom: borderThick };
    sheet.getCell(`E${lastRow}`).border = { bottom: borderThick };

    // Sol çerçeve (A sütunu)
    for (let i = 1; i <= lastRow; i++) {
        sheet.getCell(`A${i}`).border = { ...sheet.getCell(`A${i}`).border, left: borderThick };
    }

    // Sağ çerçeve (E sütunu)
    for (let i = 1; i <= lastRow; i++) {
        sheet.getCell(`E${i}`).border = { ...sheet.getCell(`E${i}`).border, right: borderThick };
    }

    // Sayfa çıktısı A4'e sığacak şekilde ayarlanıyor
    sheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        horizontalCentered: true, // Yatay ortalama
        verticalCentered: true, // Dikey ortalama
        margins: {
            left: 0.4724, // 1.2 cm
            right: 0.4724, // 1.2 cm
            top: 0.4724, // 1.2 cm
            bottom: 0.4724, // 1.2 cm
            header: 0,
            footer: 0
        }
    };
}

// Özel menü sheet oluşturma (PowerPoint benzeri görsel tasarım)
function createSpecialMenuSheet(workbook, gunMenus, dateStr, menu, day) {
    const sheet = workbook.addWorksheet('Özel Menü');

    // Sütun genişlikleri - dikey düzen için optimize edilmiş
    sheet.columns = [
        { width: 120 }  // Tek sütun, geniş
    ];

    // Stil tanımları
    const fontTitle = { name: 'Arial Black', size: 32, bold: true, italic: true, color: { argb: 'FF000000' } };
    const fontCategory = { name: 'Arial Black', size: 20, bold: true, italic: true, color: { argb: 'FF000000' } };
    const fontItem = { name: 'Arial Black', size: 16, italic: true, color: { argb: 'FF000000' } };
    const borderThick = { style: 'thick', color: { argb: 'FF000000' } };
    const fillLightBlue = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3FF' } };

    let row = 1;

    // Üst dekoratif alan (mavi dalgalı efekt için)
    sheet.mergeCells(`A${row}:A${row + 2}`);
    sheet.getCell(`A${row}`).fill = fillLightBlue;
    sheet.getRow(row).height = 15;
    sheet.getRow(row + 1).height = 15;
    sheet.getRow(row + 2).height = 15;
    row += 3;

    // Ana başlık - MENÜ
    sheet.mergeCells(`A${row}:A${row + 1}`);
    sheet.getCell(`A${row}`).value = 'MENÜ';
    sheet.getCell(`A${row}`).font = fontTitle;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(row).height = 50;
    sheet.getRow(row + 1).height = 50;
    row += 2;

    // Boşluk
    sheet.getRow(row).height = 20;
    row++;

    // Menü kategorileri ve yemekler
    const categories = [
        { name: 'ÇORBA', items: gunMenus['Çorbalar'] || [] },
        { name: 'SALATA', items: filterForMenuType(gunMenus['Salata'] || [], 'ozel') },
        { name: 'ANA YEMEK', items: gunMenus['Ana Yemekler'] || [] },
        { name: 'TATLI', items: gunMenus['Tatlılar'] || [] }
    ];

    categories.forEach(category => {
        if (category.items.length > 0) {
            // Kategori başlığı
            sheet.getCell(`A${row}`).value = `*${category.name}*`;
            sheet.getCell(`A${row}`).font = fontCategory;
            sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
            sheet.getRow(row).height = 35;
            row++;

            // Kategori altındaki yemekler
            category.items.forEach(item => {
                const itemName = item.ad || item.name || item;
                sheet.getCell(`A${row}`).value = itemName;
                sheet.getCell(`A${row}`).font = fontItem;
                sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
                sheet.getRow(row).height = 30;
                row++;
            });

            // Kategori sonrası boşluk
            sheet.getRow(row).height = 15;
            row++;
        }
    });

    // Eğer hiç yemek yoksa varsayılan menüyü göster
    if (row <= 8) {
        const defaultMenu = [
            { name: 'ÇORBA', items: ['TARHANA ÇORBASI'] },
            { name: 'SALATA', items: ['MEVSİM SALATA'] },
            { name: 'ANA YEMEK', items: ['KURU FASULYE', 'FIRINDA TAVUK KANAT', 'HASAN PAŞA KÖFTE'] },
            { name: 'TATLI', items: ['KAVUN', 'KARPUZ', 'TRİLİÇE'] }
        ];

        defaultMenu.forEach(category => {
            // Kategori başlığı
            sheet.getCell(`A${row}`).value = `*${category.name}*`;
            sheet.getCell(`A${row}`).font = fontCategory;
            sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
            sheet.getRow(row).height = 35;
            row++;

            // Kategori altındaki yemekler
            category.items.forEach(item => {
                sheet.getCell(`A${row}`).value = item;
                sheet.getCell(`A${row}`).font = fontItem;
                sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
                sheet.getRow(row).height = 30;
                row++;
            });

            // Kategori sonrası boşluk
            sheet.getRow(row).height = 15;
            row++;
        });
    }

    // Dış çerçeve ekle
    const lastRow = row - 1;

    // Üst çerçeve (dekoratif alanın altından başla)
    sheet.getCell('A4').border = { top: borderThick };

    // Alt çerçeve
    sheet.getCell(`A${lastRow}`).border = { bottom: borderThick };

    // Sol ve sağ çerçeve
    for (let i = 4; i <= lastRow; i++) {
        sheet.getCell(`A${i}`).border = {
            ...sheet.getCell(`A${i}`).border,
            left: borderThick,
            right: borderThick
        };
    }

    // Sayfa çıktısı A4'e sığacak şekilde ayarlanıyor
    sheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        horizontalCentered: true, // Yatay ortalama
        verticalCentered: true, // Dikey ortalama
        margins: {
            left: 0.7874, // 2 cm
            right: 0.7874, // 2 cm
            top: 0.7874, // 2 cm
            bottom: 0.7874, // 2 cm
            header: 0,
            footer: 0
        }
    };
}

// Eski Excel çıktısındaki gibi Self Menü sekmesi oluştur
function createSelfMenuSheet(workbook, gunMenus, dateStr, menu, day) {
    const sheet = workbook.addWorksheet('Self Menü (5)');

    // Sütun genişlikleri (pt cinsinden):
    // <col width=492> <col width=142> <col width=15> <col width=13> <col width=255> <col width=104> <col width=1782>
    // ExcelJS'de yaklaşık olarak:
    sheet.columns = [
        { width: 57 }, // 492px -> 69 karakter
        { width: 13 }, // 142px -> 20 karakter
        { width: 2 },  // 15px -> 2 karakter
        { width: 2 },  // 13px -> 2 karakter
        { width: 36 }, // 255px -> 36 karakter
        { width: 13 }, // 104px -> 15 karakter
        { width: 200 } // 1782px -> 200 karakter (boşluk için)
    ];

    // Stil tanımları
    const fontHeader = { name: 'Arial Black', size: 22, bold: true, color: { argb: 'FF000000' } };
    const fontSubHeader = { name: 'Arial Black', size: 18, bold: true, color: { argb: 'FF000000' } };
    const fontCategory = { name: 'Arial Black', size: 16, bold: true, color: { argb: 'FF000000' } };
    const fontCell = { name: 'Arial Black', size: 13, color: { argb: 'FF000000' } };
    const borderThickest = { style: 'thick', color: { argb: 'FF000000' } };
    const fillGreen = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
    const fillGray = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };

    let row = 1;
    // 1. Satır: Büyük başlık (merge)
    sheet.mergeCells(`A${row}:F${row}`);
    sheet.getCell(`A${row}`).value = 'BEYTEPE SOSYAL TESİS MÜDÜRLÜĞÜ';
    sheet.getCell(`A${row}`).font = fontHeader;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(row).height = 30;
    row++;

    // 2. Satır: Tarih ve Menü tipi
    sheet.mergeCells(`A${row}:D${row}`);
    sheet.getCell(`A${row}`).value = dateStr;
    sheet.getCell(`A${row}`).font = fontSubHeader;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.mergeCells(`E${row}:F${row}`);
    sheet.getCell(`E${row}`).value = 'SELF MENÜ';
    sheet.getCell(`E${row}`).font = fontSubHeader;
    sheet.getCell(`E${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(row).height = 30;
    row++;

    // 3. Satır: Çorbalar ve Ekmekler başlık satırı (yeşil, beyaz yazı, ortalanmış)
    sheet.mergeCells(`A${row}:B${row}`);
    sheet.getCell(`A${row}`).value = 'ÇORBALAR';
    sheet.getCell(`A${row}`).font = fontCategory;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`A${row}`).fill = fillGreen;
    sheet.mergeCells(`E${row}:F${row}`);
    sheet.getCell(`E${row}`).value = 'EKMEKLER';
    sheet.getCell(`E${row}`).font = fontCategory;
    sheet.getCell(`E${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`E${row}`).fill = fillGreen;
    sheet.getRow(row).height = 32;
    row++;

    // Çorbalar ve Ekmekler içerik satırları (maksimum 3 satır örnek)
    const corbalar = gunMenus['Çorbalar'] || [];
    const ekmekler = gunMenus['Ekmekler'] || [];
    for (let i = 0; i < Math.max(corbalar.length, ekmekler.length, 4); i++) {
        sheet.getCell(`A${row}`).value = corbalar[i]?.ad ? corbalar[i].ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`A${row}`).font = fontCell;
        sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        // Çorbalar fiyatı
        formatFiyatCellForExcel(sheet.getCell(`B${row}`), corbalar[i]?.fiyat, corbalar[i]?.ad);
        sheet.getCell(`B${row}`).font = fontCell;
        sheet.getCell(`B${row}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getCell(`E${row}`).value = ekmekler[i]?.ad ? ekmekler[i].ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`E${row}`).font = fontCell;
        sheet.getCell(`E${row}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        // Ekmekler fiyatı
        formatFiyatCellForExcel(sheet.getCell(`F${row}`), ekmekler[i]?.fiyat, ekmekler[i]?.ad);
        sheet.getCell(`F${row}`).font = fontCell;
        sheet.getCell(`F${row}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getRow(row).height = 27;
        row++;
    }

    // Ana Yemekler ve İçecekler başlık satırı (yeşil, beyaz yazı, ortalanmış)
    sheet.mergeCells(`A${row}:B${row}`);
    sheet.getCell(`A${row}`).value = 'ANA YEMEKLER';
    sheet.getCell(`A${row}`).font = fontCategory;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    sheet.getCell(`A${row}`).fill = fillGreen;
    sheet.mergeCells(`E${row}:F${row}`);
    sheet.getCell(`E${row}`).value = 'İÇECEKLER';
    sheet.getCell(`E${row}`).font = fontCategory;
    sheet.getCell(`E${row}`).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    sheet.getCell(`E${row}`).fill = fillGreen;
    sheet.getRow(row).height = 32;
    row++;

    // Ana Yemekler içerik satırları (sadece ana yemekler kadar satır)
    const anaYemekler = gunMenus['Ana Yemekler'] || [];
    let anaYemeklerRow = anaYemekler.length;
    if (anaYemeklerRow < 5) {
        if(anaYemeklerRow == 4){
            anaYemeklerRow = anaYemeklerRow + 1;
        }else{
            anaYemeklerRow = anaYemeklerRow + 2;
        }
    }
    
    for (let i = 0; i < anaYemeklerRow; i++) {
        sheet.getCell(`A${row}`).value = anaYemekler[i]?.ad ? anaYemekler[i].ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`A${row}`).font = fontCell;
        sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        formatFiyatCellForExcel(sheet.getCell(`B${row}`), anaYemekler[i]?.fiyat, anaYemekler[i]?.ad);
        sheet.getCell(`B${row}`).font = fontCell;
        sheet.getCell(`B${row}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getRow(row).height = 33;
        row++;
    }

    // İçecekler başlığının hemen altından başlayacak şekilde, her içecek bir satıra yazılacak
    const icecekler = gunMenus['İçecekler'] || [];
    let iceceklerRow = row - anaYemekler.length - 2; // İçecekler başlığının hemen altı
    if (anaYemekler.length >= 5) {
        if(anaYemekler.length == 4){
            iceceklerRow = iceceklerRow + 1;
        }else{
            iceceklerRow = iceceklerRow + 2;
        }
    }else{
        if(anaYemekler.length == 4){
            iceceklerRow = iceceklerRow + 1;
        }
    }

    for (let i = 0; i < icecekler.length; i++) {
        sheet.getCell(`E${iceceklerRow}`).value = icecekler[i]?.ad ? icecekler[i].ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`E${iceceklerRow}`).font = fontCell;
        sheet.getCell(`E${iceceklerRow}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        formatFiyatCellForExcel(sheet.getCell(`F${iceceklerRow}`), icecekler[i]?.fiyat, icecekler[i]?.ad);
        sheet.getCell(`F${iceceklerRow}`).font = fontCell;
        sheet.getCell(`F${iceceklerRow}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getRow(iceceklerRow).height = 25;
        iceceklerRow++;
    }

    // İçeceklerden hemen sonra Tatlı başlığı ve satırları (E ve F sütununda)
    const tatlilar = gunMenus['Tatlılar'] || [];
    // Tatlı başlığı
    sheet.mergeCells(`E${iceceklerRow}:F${iceceklerRow}`);
    sheet.getCell(`E${iceceklerRow}`).value = 'TATLI';
    sheet.getCell(`E${iceceklerRow}`).font = fontCategory;
    sheet.getCell(`E${iceceklerRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`E${iceceklerRow}`).fill = fillGreen;
    sheet.getRow(iceceklerRow).height = 33;
    iceceklerRow++;
    // Tatlılar satırları
    for (let i = 0; i < tatlilar.length + 2; i++) {
        sheet.getCell(`E${iceceklerRow}`).value = tatlilar[i]?.ad ? tatlilar[i].ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`E${iceceklerRow}`).font = fontCell;
        sheet.getCell(`E${iceceklerRow}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        formatFiyatCellForExcel(sheet.getCell(`F${iceceklerRow}`), tatlilar[i]?.fiyat, tatlilar[i]?.ad);
        sheet.getCell(`F${iceceklerRow}`).font = fontCell;
        sheet.getCell(`F${iceceklerRow}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getRow(iceceklerRow).height = 25;
        iceceklerRow++;
    }

    // Pilav & Makarna ve Tatlı başlık satırı (yeşil, beyaz yazı, ortalanmış)
    sheet.mergeCells(`A${row}:B${row}`);
    sheet.getCell(`A${row}`).value = 'PİLAV & MAKARNA';
    sheet.getCell(`A${row}`).font = fontCategory;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`A${row}`).fill = fillGreen;
    // Tatlı başlığı ve sütunu kaldırıldı
    sheet.getRow(row).height = 33;
    row++;

    // Pilav & Makarna içerik satırları
    const pilavMakarna = gunMenus['Pilav / Makarna'] || [];
    for (let i = 0; i < pilavMakarna.length + 2; i++) {
        sheet.getCell(`A${row}`).value = pilavMakarna[i]?.ad ? pilavMakarna[i].ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`A${row}`).font = fontCell;
        sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        // Pilav/Makarna fiyatı
        formatFiyatCellForExcel(sheet.getCell(`B${row}`), pilavMakarna[i]?.fiyat, pilavMakarna[i]?.ad);
        sheet.getCell(`B${row}`).font = fontCell;
        sheet.getCell(`B${row}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getRow(row).height = 25;
        row++;
    }

    // Salata başlığı (yeşil, beyaz yazı, ortalanmış)
    sheet.mergeCells(`A${row}:B${row}`);
    sheet.getCell(`A${row}`).value = 'SALATA';
    sheet.getCell(`A${row}`).font = fontCategory;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`A${row}`).fill = fillGreen;
    sheet.getRow(row).height = 33;
    row++;
    const salatalar = filterForMenuType(gunMenus['Salata'] || [], 'self');
    for (let i = 0; i < Math.max(salatalar.length, 3); i++) {
        sheet.getCell(`A${row}`).value = salatalar[i]?.ad ? salatalar[i].ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`A${row}`).font = fontCell;
        sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        // Salatalar fiyatı
        formatFiyatCellForExcel(sheet.getCell(`B${row}`), salatalar[i]?.fiyat, salatalar[i]?.ad);
        sheet.getCell(`B${row}`).font = fontCell;
        sheet.getCell(`B${row}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getRow(row).height = 25;
        row++;
    }

    // Zeytinyağlılar ve Soğuklar başlığı (yeşil, beyaz yazı, ortalanmış)
    sheet.mergeCells(`A${row}:B${row}`);
    sheet.getCell(`A${row}`).value = 'ZEYTİNYAĞLILAR VE SOĞUKLAR';
    sheet.getCell(`A${row}`).font = fontCategory;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`A${row}`).fill = fillGreen;
    sheet.getRow(row).height = 33;
    row++;
    const zeytinyaglilar = gunMenus['Zeytinyağlılar'] || [];
    const soguklar = gunMenus['Soğuklar'] || [];
    const zeytinSoguk = [...soguklar, ...zeytinyaglilar];
    for (let i = 0; i < Math.max(zeytinSoguk.length, 16); i++) {
        sheet.getCell(`A${row}`).value = zeytinSoguk[i]?.ad ? zeytinSoguk[i].ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`A${row}`).font = fontCell;
        sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        // Zeytinyağlılar ve soğuklar fiyatı
        formatFiyatCellForExcel(sheet.getCell(`B${row}`), zeytinSoguk[i]?.fiyat, zeytinSoguk[i]?.ad);
        sheet.getCell(`B${row}`).font = fontCell;
        sheet.getCell(`B${row}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getRow(row).height = 25;
        row++;
    }

    // Kenarlıklar ve son rötuşlar
    for (let r = 1; r < row; r++) {
        for (let c of ['A', 'B', 'C', 'D', 'E', 'F']) {
            const cell = sheet.getCell(`${c}${r}`);
            cell.border = {};
            // 1. satırın üstüne border
            if (r === 1) {
                cell.border = { ...cell.border, top: borderThickest };
            }
            // Son satırın altına border
            if (r === row - 1) {
                cell.border = { ...cell.border, bottom: borderThickest };
            }
            // A sütununun soluna border
            if (c === 'A') {
                cell.border = { ...cell.border, left: borderThickest };
            }
            // F sütununun sağına border
            if (c === 'F') {
                cell.border = { ...cell.border, right: borderThickest };
            }
            // 2. satırın altına border (varsa)
            if (r === 2) {
                cell.border = { ...cell.border, bottom: borderThickest };
            }
            // D sütununun soluna border (orta çizgi)
            if (c === 'D') {
                cell.border = { ...cell.border, left: borderThickest };
            }
            // 3. satırda C ve D hücrelerinin arkaplan rengini kaldır ve sağ border'ı kaldır
            if (r === 3) {
                if (c === 'C' || c === 'D') {
                    cell.fill = undefined;
                    cell.border = { ...cell.border, right: undefined };
                }
            }
            // 1. ve 2. satırda alignment ayarını ASLA değiştirme!
            if (r > 2) {
                const isHeaderRow = cell.fill && cell.fill.type === 'pattern' && cell.fill.pattern === 'solid' && cell.fill.fgColor && cell.fill.fgColor.argb === 'FF92D050';
                if (!isHeaderRow) {
                    cell.alignment = { vertical: 'middle', horizontal: (c === 'B' || c === 'F') ? 'right' : 'left', wrapText: true };
                }
            }
        }
    }

    // Belirli satırların soluna border ekle (A sütunu)
    [1, 3, 8, 14, 18, 22].forEach(r => {
        if (sheet.getCell(`A${r}`)) {
            sheet.getCell(`A${r}`).border = { ...sheet.getCell(`A${r}`).border, left: borderThickest };
        }
    });

    // Sayfa çıktısı A4'e sığacak şekilde ayarlanıyor (Self Menü dahil tüm sayfalar için)
    sheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        horizontalCentered: true, // Yatay ortalama
        verticalCentered: true, // Dikey ortalama
        margins: {
            left: 0.4724, // 1.2 cm
            right: 0.4724, // 1.2 cm
            top: 0.4724, // 1.2 cm
            bottom: 0.4724, // 1.2 cm
            header: 0,
            footer: 0
        }
    };

    // Yeşil ana başlıkların satır yüksekliğini iki katına çıkar
    for (let r = 1; r < row; r++) {
        const cell = sheet.getCell(`A${r}`);
        if (cell.fill && cell.fill.type === 'pattern' && cell.fill.pattern === 'solid' && cell.fill.fgColor && cell.fill.fgColor.argb === 'FF92D050') {
            const currentHeight = sheet.getRow(r).height || 33;
            sheet.getRow(r).height = currentHeight * 2;
        }
    }
    // Kategori başlıklarının satır yüksekliğini düşür
    // Çorbalar & Ekmekler
    sheet.getRow(3).height = 32;
    // Ana Yemekler & İçecekler
    sheet.getRow(8).height = 32;
    // Pilav & Makarna
    sheet.getRow(14).height = 32;
    // Salata
    sheet.getRow(18).height = 30;
    // Zeytinyağlılar ve Soğuklar
    sheet.getRow(22).height = 32;

    // Menü notu varsa en alta ekle
    if (menu && menu.menuNotes && menu.menuNotes['self'] && menu.menuNotes['self'].trim()) {
        row++;
        sheet.mergeCells(`A${row}:F${row}`);
        sheet.getCell(`A${row}`).value = menu.menuNotes['self'].toLocaleUpperCase('tr-TR');
        sheet.getCell(`A${row}`).font = { name: 'Arial Black', size: 14, bold: true, color: { argb: 'FF000000' } };
        sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        sheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6E6' } };
        sheet.getCell(`A${row}`).border = { top: borderThickest, left: borderThickest, bottom: borderThickest, right: borderThickest };
        sheet.getRow(row).height = 40;
    }
}

function createAlakartMenuSheet(workbook, gunMenus, dateStr, tip, menu) {
    const sheet = workbook.addWorksheet(tip === 'dikey' ? 'Alakart Menü Dikey (2)' : 'Alakart Menü Yatay (1)');

    // Yatay versiyon için sütun genişlikleri daha geniş
    if (tip === 'yatay') {
        sheet.columns = [
            { width: 100 }, // Çorbalar sütunu - çok daha geniş
            { width: 32 },  // Çorbalar fiyat sütunu
            { width: 15 },  // C sütunu - daha geniş
            { width: 15 },  // D sütunu - daha geniş
            { width: 80 },  // Ekmekler sütunu - daha geniş
            { width: 32 },  // Ekmekler fiyat sütunu
            { width: 130 }  // Boşluk için
        ];
    } else {
        // Dikey versiyon için mevcut genişlikler
        sheet.columns = [
            { width: 57 }, // 492px -> 69 karakter
            { width: 13 }, // 142px -> 20 karakter
            { width: 2 },  // 15px -> 2 karakter
            { width: 2 },  // 13px -> 2 karakter
            { width: 36 }, // 255px -> 36 karakter
            { width: 13 }, // 104px -> 15 karakter
            { width: 200 } // 1782px -> 200 karakter (boşluk için)
        ];
    }

    // Stil tanımları
    let fontHeader, fontSubHeader, fontCategory, fontCell;
    if (tip === 'yatay') {
        fontHeader = { name: 'Arial Black', size: 32, bold: true, color: { argb: 'FF000000' } };
        fontSubHeader = { name: 'Arial Black', size: 28, bold: true, color: { argb: 'FF000000' } };
        fontCategory = { name: 'Arial Black', size: 22, bold: true, color: { argb: 'FF000000' } };
        fontCell = { name: 'Arial Black', size: 18, color: { argb: 'FF000000' } };
    } else {
        fontHeader = { name: 'Arial Black', size: 22, bold: true, color: { argb: 'FF000000' } };
        fontSubHeader = { name: 'Arial Black', size: 18, bold: true, color: { argb: 'FF000000' } };
        fontCategory = { name: 'Arial Black', size: 16, bold: true, color: { argb: 'FF000000' } };
        fontCell = { name: 'Arial Black', size: 13, color: { argb: 'FF000000' } };
    }
    const borderThickest = { style: 'thick', color: { argb: 'FF000000' } };
    const fillGreen = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
    const fillGray = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };

    let row = 1;
    // 1. Satır: Büyük başlık (merge)
    sheet.mergeCells(`A${row}:F${row}`);
    sheet.getCell(`A${row}`).value = 'BEYTEPE SOSYAL TESİS MÜDÜRLÜĞÜ';
    sheet.getCell(`A${row}`).font = fontHeader;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    if (tip === 'yatay') {
        sheet.getRow(row).height = 40;
    } else {
        sheet.getRow(row).height = 30;
    }
    row++;

    // 2. Satır: Tarih ve Menü tipi
    sheet.mergeCells(`A${row}:D${row}`);
    sheet.getCell(`A${row}`).value = `${dateStr}`;
    sheet.getCell(`A${row}`).font = fontSubHeader;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.mergeCells(`E${row}:F${row}`);
    sheet.getCell(`E${row}`).value = 'ALAKART MENÜ';
    sheet.getCell(`E${row}`).font = fontSubHeader;
    sheet.getCell(`E${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    if (tip === 'yatay') {
        sheet.getRow(row).height = 35;
    } else {
        sheet.getRow(row).height = 30;
    }
    row++;

    // 3. Satır: Çorbalar ve Ekmekler başlık satırı (yeşil, beyaz yazı, ortalanmış)
    sheet.mergeCells(`A${row}:B${row}`);
    sheet.getCell(`A${row}`).value = 'ÇORBALAR';
    sheet.getCell(`A${row}`).font = fontCategory;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`A${row}`).fill = fillGreen;
    sheet.mergeCells(`E${row}:F${row}`);
    sheet.getCell(`E${row}`).value = 'EKMEKLER';
    sheet.getCell(`E${row}`).font = fontCategory;
    sheet.getCell(`E${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`E${row}`).fill = fillGreen;
    sheet.getRow(row).height = 32;
    row++;

    // Çorbalar ve Ekmekler içerik satırları (maksimum 3 satır örnek)
    const corbalar = gunMenus['Çorbalar'] || [];
    const ekmekler = gunMenus['Ekmekler'] || [];
    for (let i = 0; i < Math.max(corbalar.length, ekmekler.length, 4); i++) {
        sheet.getCell(`A${row}`).value = corbalar[i]?.ad ? corbalar[i].ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`A${row}`).font = fontCell;
        sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        // Çorbalar fiyatı
        let corbaFiyat = (corbalar[i] && corbalar[i].fiyat2 !== undefined && corbalar[i].fiyat2 !== null && corbalar[i].fiyat2 !== '') ? corbalar[i].fiyat2 : corbalar[i]?.fiyat;
        formatFiyatCellForExcel(sheet.getCell(`B${row}`), corbaFiyat, corbalar[i]?.ad);
        sheet.getCell(`B${row}`).font = fontCell;
        sheet.getCell(`B${row}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getCell(`E${row}`).value = ekmekler[i]?.ad ? ekmekler[i].ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`E${row}`).font = fontCell;
        sheet.getCell(`E${row}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        // Ekmekler fiyatı (tek fiyat)
        formatFiyatCellForExcel(sheet.getCell(`F${row}`), ekmekler[i]?.fiyat, ekmekler[i]?.ad);
        sheet.getCell(`F${row}`).font = fontCell;
        sheet.getCell(`F${row}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getRow(row).height = 27;
        row++;
    }

    // Ana Yemekler ve İçecekler başlık satırı (yeşil, beyaz yazı, ortalanmış)
    sheet.mergeCells(`A${row}:B${row}`);
    sheet.getCell(`A${row}`).value = 'ANA YEMEKLER';
    sheet.getCell(`A${row}`).font = fontCategory;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`A${row}`).fill = fillGreen;
    sheet.mergeCells(`E${row}:F${row}`);
    sheet.getCell(`E${row}`).value = 'İÇECEKLER';
    sheet.getCell(`E${row}`).font = fontCategory;
    sheet.getCell(`E${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`E${row}`).fill = fillGreen;
    sheet.getRow(row).height = 32;
    row++;

    // Ana Yemekler içerik satırları (sadece ana yemekler kadar satır)
    const anaYemekler = gunMenus['Ana Yemekler'] || [];
    let anaYemeklerRow = anaYemekler.length;
    if (anaYemeklerRow < 5) {
        if(anaYemeklerRow == 4){
            anaYemeklerRow = anaYemeklerRow + 1;
        }else{
            anaYemeklerRow = anaYemeklerRow + 2;
        }
    }
    for (let i = 0; i < anaYemeklerRow; i++) {
        sheet.getCell(`A${row}`).value = anaYemekler[i]?.ad ? anaYemekler[i].ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`A${row}`).font = fontCell;
        sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        let anaFiyat = (anaYemekler[i] && anaYemekler[i].fiyat2 !== undefined && anaYemekler[i].fiyat2 !== null && anaYemekler[i].fiyat2 !== '') ? anaYemekler[i].fiyat2 : anaYemekler[i]?.fiyat;
        formatFiyatCellForExcel(sheet.getCell(`B${row}`), anaFiyat, anaYemekler[i]?.ad);
        sheet.getCell(`B${row}`).font = fontCell;
        sheet.getCell(`B${row}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getRow(row).height = 33;
        row++;
    }

    // İçecekler başlığının hemen altından başlayacak şekilde, her içecek bir satıra yazılacak
    const icecekler = gunMenus['İçecekler'] || [];
    let iceceklerRow = row - anaYemekler.length - 2; // İçecekler başlığının hemen altı
    if (anaYemekler.length >= 5) {
        if(anaYemekler.length == 4){
            iceceklerRow = iceceklerRow + 1;
        }else{
            iceceklerRow = iceceklerRow + 2;
        }
    }else{
        if(anaYemekler.length == 4){
            iceceklerRow = iceceklerRow + 1;
        }
    }

    for (let i = 0; i < icecekler.length; i++) {
        sheet.getCell(`E${iceceklerRow}`).value = icecekler[i]?.ad ? icecekler[i].ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`E${iceceklerRow}`).font = fontCell;
        sheet.getCell(`E${iceceklerRow}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        formatFiyatCellForExcel(sheet.getCell(`F${iceceklerRow}`), icecekler[i]?.fiyat, icecekler[i]?.ad);
        sheet.getCell(`F${iceceklerRow}`).font = fontCell;
        sheet.getCell(`F${iceceklerRow}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getRow(iceceklerRow).height = 25;
        iceceklerRow++;
    }

    // İçeceklerden hemen sonra Tatlı başlığı ve satırları (E ve F sütununda)
    const tatlilar = filterForMenuType(gunMenus['Tatlılar'] || [], 'alakart');
    // Tatlı başlığı
    sheet.mergeCells(`E${iceceklerRow}:F${iceceklerRow}`);
    sheet.getCell(`E${iceceklerRow}`).value = 'TATLI';
    sheet.getCell(`E${iceceklerRow}`).font = fontCategory;
    sheet.getCell(`E${iceceklerRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`E${iceceklerRow}`).fill = fillGreen;
    sheet.getRow(iceceklerRow).height = 33;
    iceceklerRow++;
    // Tatlılar satırları
    for (let i = 0; i < tatlilar.length + 2; i++) {
        sheet.getCell(`E${iceceklerRow}`).value = tatlilar[i]?.ad ? tatlilar[i].ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`E${iceceklerRow}`).font = fontCell;
        sheet.getCell(`E${iceceklerRow}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        let tatliFiyat = (tatlilar[i] && tatlilar[i].fiyat2 !== undefined && tatlilar[i].fiyat2 !== null && tatlilar[i].fiyat2 !== '') ? tatlilar[i].fiyat2 : tatlilar[i]?.fiyat;
        formatFiyatCellForExcel(sheet.getCell(`F${iceceklerRow}`), tatliFiyat, tatlilar[i]?.ad);
        sheet.getCell(`F${iceceklerRow}`).font = fontCell;
        sheet.getCell(`F${iceceklerRow}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getRow(iceceklerRow).height = 25;
        iceceklerRow++;
    }

    // Tatlılardan hemen sonra Izgaralar başlığı ve satırları (E ve F sütununda)
    const izgaralar = gunMenus['Izgaralar'] || [];
    // Izgaralar başlığı
    sheet.mergeCells(`E${iceceklerRow}:F${iceceklerRow}`);
    sheet.getCell(`E${iceceklerRow}`).value = 'IZGARALAR';
    sheet.getCell(`E${iceceklerRow}`).font = fontCategory;
    sheet.getCell(`E${iceceklerRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`E${iceceklerRow}`).fill = fillGreen;
    sheet.getRow(iceceklerRow).height = 33;
    iceceklerRow++;
    // Izgaralar satırları
    for (let i = 0; i < izgaralar.length + 2; i++) {
        sheet.getCell(`E${iceceklerRow}`).value = izgaralar[i]?.ad ? izgaralar[i].ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`E${iceceklerRow}`).font = fontCell;
        sheet.getCell(`E${iceceklerRow}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        formatFiyatCellForExcel(sheet.getCell(`F${iceceklerRow}`), izgaralar[i]?.fiyat, izgaralar[i]?.ad);
        sheet.getCell(`F${iceceklerRow}`).font = fontCell;
        sheet.getCell(`F${iceceklerRow}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getRow(iceceklerRow).height = 25;
        iceceklerRow++;
    }

    // Pilav & Makarna ve Tatlı başlık satırı (yeşil, beyaz yazı, ortalanmış)
    sheet.mergeCells(`A${row}:B${row}`);
    sheet.getCell(`A${row}`).value = 'PİLAV & MAKARNA';
    sheet.getCell(`A${row}`).font = fontCategory;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`A${row}`).fill = fillGreen;
    // Tatlı başlığı ve sütunu kaldırıldı
    sheet.getRow(row).height = 33;
    row++;

    // Pilav & Makarna içerik satırları
    const pilavMakarna = gunMenus['Pilav / Makarna'] || [];
    for (let i = 0; i < pilavMakarna.length + 2; i++) {
        sheet.getCell(`A${row}`).value = pilavMakarna[i]?.ad ? pilavMakarna[i].ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`A${row}`).font = fontCell;
        sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        // Pilav/Makarna fiyatı
        let pilavFiyat = (pilavMakarna[i] && pilavMakarna[i].fiyat2 !== undefined && pilavMakarna[i].fiyat2 !== null && pilavMakarna[i].fiyat2 !== '') ? pilavMakarna[i].fiyat2 : pilavMakarna[i]?.fiyat;
        formatFiyatCellForExcel(sheet.getCell(`B${row}`), pilavFiyat, pilavMakarna[i]?.ad);
        sheet.getCell(`B${row}`).font = fontCell;
        sheet.getCell(`B${row}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getRow(row).height = 25;
        row++;
    }

    // Salata başlığı (yeşil, beyaz yazı, ortalanmış)
    sheet.mergeCells(`A${row}:B${row}`);
    sheet.getCell(`A${row}`).value = 'SALATA';
    sheet.getCell(`A${row}`).font = fontCategory;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`A${row}`).fill = fillGreen;
    sheet.getRow(row).height = 33;
    row++;
    const salatalar = filterForMenuType(gunMenus['Salata'] || [], 'alakart');
    for (let i = 0; i < Math.max(salatalar.length, 3); i++) {
        sheet.getCell(`A${row}`).value = salatalar[i]?.ad ? salatalar[i].ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`A${row}`).font = fontCell;
        sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        // Salatalar fiyatı
        let salataFiyat = (salatalar[i] && salatalar[i].fiyat2 !== undefined && salatalar[i].fiyat2 !== null && salatalar[i].fiyat2 !== '') ? salatalar[i].fiyat2 : salatalar[i]?.fiyat;
        formatFiyatCellForExcel(sheet.getCell(`B${row}`), salataFiyat, salatalar[i]?.ad);
        sheet.getCell(`B${row}`).font = fontCell;
        sheet.getCell(`B${row}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getRow(row).height = 25;
        row++;
    }

    // Zeytinyağlılar ve Soğuklar başlığı (yeşil, beyaz yazı, ortalanmış)
    sheet.mergeCells(`A${row}:B${row}`);
    sheet.getCell(`A${row}`).value = 'ZEYTİNYAĞLILAR VE SOĞUKLAR';
    sheet.getCell(`A${row}`).font = fontCategory;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`A${row}`).fill = fillGreen;
    sheet.getRow(row).height = 33;
    row++;
    const zeytinyaglilar = gunMenus['Zeytinyağlılar'] || [];
    const soguklar = gunMenus['Soğuklar'] || [];
    const zeytinSoguk = [...soguklar, ...zeytinyaglilar];
    const maxZeytinSoguk = Math.max(zeytinSoguk.length, 16); // Minimum 8 satır
    for (let i = 0; i < maxZeytinSoguk; i++) {
        const hasZeytinSoguk = zeytinSoguk[i]?.ad;

        sheet.getCell(`A${row}`).value = hasZeytinSoguk ? zeytinSoguk[i].ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`A${row}`).font = fontCell;
        sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        // Zeytinyağlılar ve soğuklar fiyatı
        let zeytinFiyat = (zeytinSoguk[i] && zeytinSoguk[i].fiyat2 !== undefined && zeytinSoguk[i].fiyat2 !== null && zeytinSoguk[i].fiyat2 !== '') ? zeytinSoguk[i].fiyat2 : zeytinSoguk[i]?.fiyat;
        formatFiyatCellForExcel(sheet.getCell(`B${row}`), zeytinFiyat, zeytinSoguk[i]?.ad);
        sheet.getCell(`B${row}`).font = fontCell;
        sheet.getCell(`B${row}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getRow(row).height = 25;
        row++;
    }

    // Kenarlıklar ve son rötuşlar
    for (let r = 1; r < row; r++) {
        for (let c of ['A', 'B', 'C', 'D', 'E', 'F']) {
            const cell = sheet.getCell(`${c}${r}`);
            cell.border = {};
            // 1. satırın üstüne border
            if (r === 1) {
                cell.border = { ...cell.border, top: borderThickest };
            }
            // Son satırın altına border
            if (r === row - 1) {
                cell.border = { ...cell.border, bottom: borderThickest };
            }
            // A sütununun soluna border
            if (c === 'A') {
                cell.border = { ...cell.border, left: borderThickest };
            }
            // F sütununun sağına border
            if (c === 'F') {
                cell.border = { ...cell.border, right: borderThickest };
            }
            // 2. satırın altına border (varsa)
            if (r === 2) {
                cell.border = { ...cell.border, bottom: borderThickest };
            }
            // D sütununun soluna border (orta çizgi)
            if (c === 'D') {
                cell.border = { ...cell.border, left: borderThickest };
            }
            // 3. satırda C ve D hücrelerinin arkaplan rengini kaldır ve sağ border'ı kaldır
            if (r === 3) {
                if (c === 'C' || c === 'D') {
                    cell.fill = undefined;
                    cell.border = { ...cell.border, right: undefined };
                }
            }
            // 1. ve 2. satırda alignment ayarını ASLA değiştirme!
            if (r > 2) {
                const isHeaderRow = cell.fill && cell.fill.type === 'pattern' && cell.fill.pattern === 'solid' && cell.fill.fgColor && cell.fill.fgColor.argb === 'FF92D050';
                if (!isHeaderRow) {
                    cell.alignment = { vertical: 'middle', horizontal: (c === 'B' || c === 'F') ? 'right' : 'left', wrapText: true };
                }
            }
        }
    }

    // Belirli satırların soluna border ekle (A sütunu)
    [1, 3, 8, 14, 18, 22, 26].forEach(r => {
        if (sheet.getCell(`A${r}`)) {
            sheet.getCell(`A${r}`).border = { ...sheet.getCell(`A${r}`).border, left: borderThickest };
        }
    });

    // Sayfa çıktısı A4'e sığacak şekilde ayarlanıyor (Self Menü dahil tüm sayfalar için)
    if (tip === 'yatay') {
        // Yatay versiyon için landscape
        sheet.pageSetup = {
            paperSize: 9, // A4
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 1,
            horizontalCentered: true, // Yatay ortalama
            verticalCentered: true, // Dikey ortalama
            margins: {
                left: 0.4724, // 1.2 cm
                right: 0.4724, // 1.2 cm
                top: 0.4724, // 1.2 cm
                bottom: 0.4724, // 1.2 cm
                header: 0,
                footer: 0
            }
        };
    } else {
        // Dikey versiyon için portrait
        sheet.pageSetup = {
            paperSize: 9, // A4
            orientation: 'portrait',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 1,
            horizontalCentered: true, // Yatay ortalama
            verticalCentered: true, // Dikey ortalama
            margins: {
                left: 0.4724, // 1.2 cm
                right: 0.4724, // 1.2 cm
                top: 0.4724, // 1.2 cm
                bottom: 0.4724, // 1.2 cm
                header: 0,
                footer: 0
            }
        };
    }

    // Yeşil ana başlıkların satır yüksekliğini iki katına çıkar
    for (let r = 1; r < row; r++) {
        const cell = sheet.getCell(`A${r}`);
        if (cell.fill && cell.fill.type === 'pattern' && cell.fill.pattern === 'solid' && cell.fill.fgColor && cell.fill.fgColor.argb === 'FF92D050') {
            const currentHeight = sheet.getRow(r).height || 33;
            sheet.getRow(r).height = currentHeight * 2;
        }
    }
    // Kategori başlıklarının satır yüksekliğini düşür
    // Çorbalar & Ekmekler
    sheet.getRow(3).height = 32;
    // Ana Yemekler & İçecekler
    sheet.getRow(8).height = 32;
    // Pilav & Makarna
    sheet.getRow(14).height = 32;
    // Salata
    sheet.getRow(18).height = 30;
    // Zeytinyağlılar ve Soğuklar
    sheet.getRow(22).height = 32;
    // Izgaralar
    sheet.getRow(26).height = 32;

    // Menü notu varsa en alta ekle
    let noteKey = 'self';
    if (typeof tip === 'string') {
        if (tip === 'dikey') noteKey = 'alakartDikey';
        else if (tip === 'yatay') noteKey = 'alakartYatay';
    }
    if (menu && menu.menuNotes && menu.menuNotes[noteKey] && menu.menuNotes[noteKey].trim()) {
        row++;
        sheet.mergeCells(`A${row}:F${row}`);
        sheet.getCell(`A${row}`).value = menu.menuNotes[noteKey].toLocaleUpperCase('tr-TR');
        sheet.getCell(`A${row}`).font = { name: 'Arial Black', size: 14, bold: true, color: { argb: 'FF000000' } };
        sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        sheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6E6' } };
        sheet.getCell(`A${row}`).border = { top: borderThickest, left: borderThickest, bottom: borderThickest, right: borderThickest };
        sheet.getRow(row).height = 40;
    }
}

function createYemekEtiketSheet(workbook, gunMenus, dateStr, menu) {
    const sheet = workbook.addWorksheet('Yemek Etiket (1)');

    // Sütun genişliği: 80 (birebir)
    sheet.columns = [
        { width: 73 },
        { width: 73 }
    ];

    // Sayfa ayarları: A4, dikey, fit to page (KULLANICI İSTEĞİYLE portrait)
    sheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        horizontalCentered: true, // Yatay ortalama
        verticalCentered: true, // Dikey ortalama
        margins: {
            left: 0.1, // 1.2 cm
            right: 0.1, // 1.2 cm
            top: 0.4724, // 1.2 cm
            bottom: 0.4724, // 1.2 cm
            header: 0.2,
            footer: 0.2
        }
    };

    // Yemekleri sırayla diziye al
    const kategoriler = [
        'Çorbalar',
        'Ana Yemekler',
        'Pilav / Makarna',
        'Salata',
        'Tatlılar'
    ];
    let yemekler = [];
    kategoriler.forEach(kat => {
        const arr = gunMenus[kat] || [];
        arr.forEach(item => {
            yemekler.push({ ad: item.ad, fiyat: item.fiyat });
        });
    });
    // Her zaman 10 adet olacak şekilde tamamla
    while (yemekler.length < 10) {
        yemekler.push({ ad: '', fiyat: '' });
    }
    yemekler = yemekler.slice(0, 10);

    // 2'li gruplar halinde sırala
    let rows = [];
    for (let i = 0; i < yemekler.length; i += 2) {
        rows.push([
            yemekler[i],
            yemekler[i + 1] || { ad: '', fiyat: '' }
        ]);
    }

    // Satırları ekle
    let rowNum = 1;
    rows.forEach((pair, idx) => {
        // Başlık satırı
        const row = sheet.getRow(rowNum);
        row.height = 180;
        [0, 1].forEach(col => {
            const cell = row.getCell(col + 1);
            cell.value = pair[col].ad ? pair[col].ad.toLocaleUpperCase('tr-TR') : '';
            cell.font = { name: 'Arial Black', size: 36, bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: { style: 'thick' },
                left: { style: 'thick' },
                right: { style: 'thick' },
                bottom: { style: 'thick' }
            };
        });
        rowNum++;
        // Fiyat satırı
        const fiyatRow = sheet.getRow(rowNum);
        fiyatRow.height = 80;
        [0, 1].forEach(col => {
            const cell = fiyatRow.getCell(col + 1);
            formatFiyatCellForExcel(cell, pair[col].fiyat, pair[col].ad);
            cell.font = { name: 'Arial Black', size: 36, bold: true };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = {
                top: { style: 'thick' },
                left: { style: 'thick' },
                right: { style: 'thick' },
                bottom: { style: 'thick' }
            };
        });
        rowNum++;
        // Her ürün çifti arasında bir satır boşluk (sonuncudan sonra eklenmez)
        if (idx < rows.length - 1) {
            const spacer = sheet.getRow(rowNum);
            spacer.height = 5;
            [0, 1].forEach(col => {
                const cell = spacer.getCell(col + 1);
                cell.value = '';
                cell.border = {};
            });
            rowNum++;
        }
    });
}

function createMezelerSheet(workbook, gunMenus, dateStr, menu) {
    const sheet = workbook.addWorksheet('Mezeler (3)');

    // Sütun genişlikleri: Ürün adı ve fiyatı için iki ana blok (sol ve sağ)
    sheet.columns = [
        { width: 60 }, // Sol ürün adı
        { width: 25 }, // Sol fiyat
        { width: 1 },  // Boşluk (ayraç)
        { width: 60 }, // Sağ ürün adı
        { width: 25 }  // Sağ fiyat
    ];

    // Stil tanımları
    const fontHeader = { name: 'Arial Black', size: 42, bold: true };
    const fontCell = { name: 'Arial Black', size: 22, bold: true };
    const borderThick = { style: 'thick' };
    const fillGray = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF808080' } };
    const fillBlack = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };

    let rowNum = 1;
    // 1. Satır: "MEZELER" başlığı (A1:E1 merge, büyük, ortalanmış, gri arka plan)
    sheet.mergeCells(`A${rowNum}:E${rowNum}`);
    const headerCell = sheet.getCell(`A${rowNum}`);
    headerCell.value = 'ZEYTİNYAĞLILAR VE SOĞUKLAR';
    headerCell.font = fontHeader;
    headerCell.alignment = { vertical: 'middle', horizontal: 'center' };
    headerCell.fill = fillGray;
    sheet.getRow(rowNum).height = 60;
    rowNum++;

    // Ürünleri storage'dan al
    const mezelerArr = (gunMenus['Soğuklar'] || []).filter(x => x && x.ad);
    const zeytinyaglilarArr = (gunMenus['Zeytinyağlılar'] || []).filter(x => x && x.ad);
    const salatalarArr = (gunMenus['Salata'] || []).filter(x => x && x.ad);
    const tatlilarArr = (gunMenus['Tatlılar'] || []).filter(x => x && x.ad);

    // Sol blok: ilk 10 meze, sağ blok: önce zeytinyağlılar, sonra salatalar, sonra başlık ve tatlılar
    const solCount = 11;
    const mezelerSol = mezelerArr.slice(0, solCount);
    const zeytinyaglilarSag = zeytinyaglilarArr;
    const salatalarSag = salatalarArr;
    const tatlilarSag = tatlilarArr;
    const boslukSatir = 2;
    const zeytinyagliSatir = zeytinyaglilarSag.length;
    const salataSatir = salatalarSag.length;
    const tatliSatir = tatlilarSag.length;
    // Sağ blokta: önce zeytinyağlılar, sonra salatalar, sonra 2 satır boşluk, sonra TATLILAR başlığı ve tatlılar
    const sagToplamSatir = zeytinyagliSatir + salataSatir + boslukSatir + (tatliSatir > 0 ? 1 + tatliSatir : 0); // 1: başlık
    const maxSatir = Math.max(solCount, sagToplamSatir);

    // Satır numaralarını kaydet
    const firstDataRow = rowNum;
    let lastDataRow = rowNum + (maxSatir - 1) * 2;

    // Satırları oluştur
    for (let i = 0; i < maxSatir; i++) {
        const row = sheet.getRow(rowNum);
        // Sol blok: ilk 10 meze
        if (i < solCount) {
            row.getCell(1).value = mezelerSol[i]?.ad ? mezelerSol[i].ad.toLocaleUpperCase('tr-TR') : '';
            row.getCell(1).font = fontCell;
            row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
            formatFiyatCellForExcel(row.getCell(2), mezelerSol[i]?.fiyat, mezelerSol[i]?.ad);
            row.getCell(2).font = fontCell;
            row.getCell(2).alignment = { vertical: 'middle', horizontal: 'right' };
        }
        // Sağ blok: önce zeytinyağlılar, sonra salatalar, sonra 2 satır boşluk, sonra TATLILAR başlığı ve tatlılar
        if (i < zeytinyagliSatir) {
            row.getCell(4).value = zeytinyaglilarSag[i]?.ad ? zeytinyaglilarSag[i].ad.toLocaleUpperCase('tr-TR') : '';
            row.getCell(4).font = fontCell;
            row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
            formatFiyatCellForExcel(row.getCell(5), zeytinyaglilarSag[i]?.fiyat, zeytinyaglilarSag[i]?.ad);
            row.getCell(5).font = fontCell;
            row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
        } else if (i >= zeytinyagliSatir && i < zeytinyagliSatir + salataSatir) {
            // Salatalar
            const salataIdx = i - zeytinyagliSatir;
            row.getCell(4).value = salatalarSag[salataIdx]?.ad ? salatalarSag[salataIdx].ad.toLocaleUpperCase('tr-TR') : '';
            row.getCell(4).font = fontCell;
            row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
            formatFiyatCellForExcel(row.getCell(5), salatalarSag[salataIdx]?.fiyat, salatalarSag[salataIdx]?.ad);
            row.getCell(5).font = fontCell;
            row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
        } else if (i >= zeytinyagliSatir + salataSatir && i < zeytinyagliSatir + salataSatir + boslukSatir) {
            // 2 satır boşluk
            // Sadece siyah boşluk sütunu
        } else if (i === zeytinyagliSatir + salataSatir + boslukSatir && tatliSatir > 0) {
            // TATLILAR başlığı sağ blokta
            sheet.mergeCells(`D${rowNum}:E${rowNum}`);
            const tatliHeader = sheet.getCell(`D${rowNum}`);
            tatliHeader.value = 'TATLILAR';
            tatliHeader.font = { name: 'Arial Black', size: 28, bold: true };
            tatliHeader.alignment = { vertical: 'middle', horizontal: 'center' };
            tatliHeader.fill = fillGray;
        } else if (i > zeytinyagliSatir + salataSatir + boslukSatir && tatliSatir > 0) {
            // Tatlılar sağ blokta listelenir
            const tatliIdx = i - (zeytinyagliSatir + salataSatir + boslukSatir + 1);
            if (tatliIdx < tatlilarSag.length) {
                row.getCell(4).value = tatlilarSag[tatliIdx]?.ad ? tatlilarSag[tatliIdx].ad.toLocaleUpperCase('tr-TR') : '';
                row.getCell(4).font = fontCell;
                row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
                formatFiyatCellForExcel(row.getCell(5), tatlilarSag[tatliIdx]?.fiyat, tatlilarSag[tatliIdx]?.ad);
                row.getCell(5).font = fontCell;
                row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
            }
        }
        // Boşluk sütunu siyah arka plan
        row.getCell(3).fill = fillBlack;
        row.height = 38;
        rowNum++;
        // Satırlar arası boşluk için (görseldeki gibi)
        if (i < maxSatir - 1) {
            const spacer = sheet.getRow(rowNum);
            spacer.height = 15;
            // Boşluk sütunu siyah arka plan
            spacer.getCell(3).fill = fillBlack;
            rowNum++;
        }
    }
    // Son veri satırını bul
    lastDataRow = rowNum - 1;

    // --- ÇEVREYE VE 3. SÜTUNA BORDER ---
    for (let r = 1; r <= lastDataRow; r++) {
        for (let c = 1; c <= 5; c++) {
            const cell = sheet.getCell(r, c);
            // Üst kenar
            if (r === 1) cell.border = { ...cell.border, top: borderThick };
            // Alt kenar
            if (r === lastDataRow) cell.border = { ...cell.border, bottom: borderThick };
            // Sol kenar
            if (c === 1) cell.border = { ...cell.border, left: borderThick };
            // Sağ kenar
            if (c === 5) cell.border = { ...cell.border, right: borderThick };
            // Boşluk sütunu (3. sütun) için hem sol hem sağ border
            if (c === 3) cell.border = { ...cell.border, left: borderThick, right: borderThick };
        }
    }

    // Sayfa ayarları: landscape, fit to page
    sheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        horizontalCentered: true, // Yatay ortalama
        verticalCentered: true, // Dikey ortalama
        margins: {
            left: 0.4724, // 1.2 cm
            right: 0.4724, // 1.2 cm
            top: 0.4724, // 1.2 cm
            bottom: 0.4724, // 1.2 cm
            header: 0.4,
            footer: 0.4
        }
    };
}

function createIceceklerSheet(workbook, gunMenus, dateStr, menu) {
    const sheet = workbook.addWorksheet('İçecekler (1)');

    // Sütun genişlikleri: Ürün adı ve fiyatı için iki ana blok (sol ve sağ)
    sheet.columns = [
        { width: 60 }, // Sol ürün adı
        { width: 25 }, // Sol fiyat
        { width: 1 },  // Boşluk (ayraç)
        { width: 60 }, // Sağ ürün adı
        { width: 25 }  // Sağ fiyat
    ];

    // Stil tanımları
    const fontHeader = { name: 'Arial Black', size: 42, bold: true };
    const fontCell = { name: 'Arial Black', size: 22, bold: true };
    const borderThick = { style: 'thick' };
    const fillGray = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF808080' } };
    const fillBlack = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };

    let rowNum = 1;
    // 1. Satır: "İÇECEKLER" başlığı (A1:E1 merge, büyük, ortalanmış, gri arka plan)
    sheet.mergeCells(`A${rowNum}:E${rowNum}`);
    const headerCell = sheet.getCell(`A${rowNum}`);
    headerCell.value = 'İÇECEKLER';
    headerCell.font = fontHeader;
    headerCell.alignment = { vertical: 'middle', horizontal: 'center' };
    headerCell.fill = fillGray;
    sheet.getRow(rowNum).height = 60;
    rowNum++;

    // Ürünleri storage'dan al
    const iceceklerArr = (gunMenus['İçecekler'] || []).filter(x => x && x.ad);
    const ekmeklerArr = (gunMenus['Ekmekler'] || []).filter(x => x && x.ad);

    // Sol blok: ilk 10 içecek, sağ blok: kalan içecekler
    const solCount = 10;
    const iceceklerSol = iceceklerArr.slice(0, solCount);
    const iceceklerSag = iceceklerArr.slice(solCount);
    const sagIcecekSatir = iceceklerSag.length;
    const ekmekSatir = ekmeklerArr.length;
    const boslukSatir = 2;
    const sagToplamSatir = sagIcecekSatir + boslukSatir + (ekmekSatir > 0 ? 1 + ekmekSatir : 0); // 1: başlık
    const maxSatir = Math.max(solCount, sagToplamSatir);

    // Satır numaralarını kaydet
    const firstDataRow = rowNum;
    let lastDataRow = rowNum + (maxSatir - 1) * 2;

    // Satırları oluştur
    for (let i = 0; i < maxSatir; i++) {
        const row = sheet.getRow(rowNum);
        // Sol blok: ilk 10 içecek
        if (i < solCount) {
            row.getCell(1).value = iceceklerSol[i]?.ad ? iceceklerSol[i].ad.toLocaleUpperCase('tr-TR') : '';
            row.getCell(1).font = fontCell;
            row.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
            formatFiyatCellForExcel(row.getCell(2), iceceklerSol[i]?.fiyat, iceceklerSol[i]?.ad);
            row.getCell(2).font = fontCell;
            row.getCell(2).alignment = { vertical: 'middle', horizontal: 'right' };
        }
        // Sağ blok: önce kalan içecekler, sonra 2 satır boşluk, sonra ekmekler başlığı ve ekmekler
        if (i < sagIcecekSatir) {
            row.getCell(4).value = iceceklerSag[i]?.ad ? iceceklerSag[i].ad.toLocaleUpperCase('tr-TR') : '';
            row.getCell(4).font = fontCell;
            row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
            formatFiyatCellForExcel(row.getCell(5), iceceklerSag[i]?.fiyat, iceceklerSag[i]?.ad);
            row.getCell(5).font = fontCell;
            row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
        } else if (i >= sagIcecekSatir && i < sagIcecekSatir + boslukSatir) {
            // 2 satır boşluk
            // Sadece siyah boşluk sütunu
        } else if (i === sagIcecekSatir + boslukSatir && ekmekSatir > 0) {
            // EKMEKLER başlığı sağ blokta
            sheet.mergeCells(`D${rowNum}:E${rowNum}`);
            const ekmekHeader = sheet.getCell(`D${rowNum}`);
            ekmekHeader.value = 'EKMEKLER';
            ekmekHeader.font = { name: 'Arial Black', size: 28, bold: true };
            ekmekHeader.alignment = { vertical: 'middle', horizontal: 'center' };
            ekmekHeader.fill = fillGray;
        } else if (i > sagIcecekSatir + boslukSatir && ekmekSatir > 0) {
            // Ekmekler sağ blokta listelenir
            const ekmekIdx = i - (sagIcecekSatir + boslukSatir + 1);
            if (ekmekIdx < ekmeklerArr.length) {
                row.getCell(4).value = ekmeklerArr[ekmekIdx]?.ad ? ekmeklerArr[ekmekIdx].ad.toLocaleUpperCase('tr-TR') : '';
                row.getCell(4).font = fontCell;
                row.getCell(4).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
                formatFiyatCellForExcel(row.getCell(5), ekmeklerArr[ekmekIdx]?.fiyat, ekmeklerArr[ekmekIdx]?.ad);
                row.getCell(5).font = fontCell;
                row.getCell(5).alignment = { vertical: 'middle', horizontal: 'right' };
            }
        }
        // Boşluk sütunu siyah arka plan
        row.getCell(3).fill = fillBlack;
        row.height = 38;
        rowNum++;
        // Satırlar arası boşluk için (görseldeki gibi)
        if (i < maxSatir - 1) {
            const spacer = sheet.getRow(rowNum);
            spacer.height = 15;
            // Boşluk sütunu siyah arka plan
            spacer.getCell(3).fill = fillBlack;
            rowNum++;
        }
    }
    // Son veri satırını bul
    lastDataRow = rowNum - 1;

    // --- ÇEVREYE VE 3. SÜTUNA BORDER ---
    for (let r = 1; r <= lastDataRow; r++) {
        for (let c = 1; c <= 5; c++) {
            const cell = sheet.getCell(r, c);
            // Üst kenar
            if (r === 1) cell.border = { ...cell.border, top: borderThick };
            // Alt kenar
            if (r === lastDataRow) cell.border = { ...cell.border, bottom: borderThick };
            // Sol kenar
            if (c === 1) cell.border = { ...cell.border, left: borderThick };
            // Sağ kenar
            if (c === 5) cell.border = { ...cell.border, right: borderThick };
            // Boşluk sütunu (3. sütun) için hem sol hem sağ border
            if (c === 3) cell.border = { ...cell.border, left: borderThick, right: borderThick };
        }
    }

    // Sayfa ayarları: landscape, fit to page
    sheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        horizontalCentered: true, // Yatay ortalama
        verticalCentered: true, // Dikey ortalama
        margins: {
            left: 0.4724, // 1.2 cm
            right: 0.4724, // 1.2 cm
            top: 0.4724, // 1.2 cm
            bottom: 0.4724, // 1.2 cm
            header: 0.2,
            footer: 0.2
        }
    };
}

function createDekanlikMenuSheet(workbook, gunMenus, dateStr, menu) {
    const sheet = workbook.addWorksheet('Dekanlık Menü (1)');

    // Sütun genişlikleri (pt cinsinden):
    // <col width=492> <col width=142> <col width=15> <col width=13> <col width=255> <col width=104> <col width=1782>
    // ExcelJS'de yaklaşık olarak:
    sheet.columns = [
        { width: 57 }, // 492px -> 69 karakter
        { width: 13 }, // 142px -> 20 karakter
        { width: 2 },  // 15px -> 2 karakter
        { width: 2 },  // 13px -> 2 karakter
        { width: 36 }, // 255px -> 36 karakter
        { width: 13 }, // 104px -> 15 karakter
        { width: 200 } // 1782px -> 200 karakter (boşluk için)
    ];

    // Stil tanımları
    const fontHeader = { name: 'Arial Black', size: 22, bold: true, color: { argb: 'FF000000' } };
    const fontSubHeader = { name: 'Arial Black', size: 18, bold: true, color: { argb: 'FF000000' } };
    const fontCategory = { name: 'Arial Black', size: 16, bold: true, color: { argb: 'FF000000' } };
    const fontCell = { name: 'Arial Black', size: 13, color: { argb: 'FF000000' } };
    const borderThickest = { style: 'thick', color: { argb: 'FF000000' } };
    const fillGreen = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92D050' } };
    const fillGray = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };

    let row = 1;
    // 1. Satır: Büyük başlık (merge)
    sheet.mergeCells(`A${row}:F${row}`);
    sheet.getCell(`A${row}`).value = 'BEYTEPE SOSYAL TESİS MÜDÜRLÜĞÜ';
    sheet.getCell(`A${row}`).font = fontHeader;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(row).height = 30;
    row++;

    // 2. Satır: Tarih ve Menü tipi
    sheet.mergeCells(`A${row}:D${row}`);
    sheet.getCell(`A${row}`).value = dateStr;
    sheet.getCell(`A${row}`).font = fontSubHeader;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.mergeCells(`E${row}:F${row}`);
    sheet.getCell(`E${row}`).value = 'DEKANLIK MENÜ';
    sheet.getCell(`E${row}`).font = fontSubHeader;
    sheet.getCell(`E${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(row).height = 30;
    row++;

    // 3. Satır: Çorbalar ve Ekmekler başlık satırı (yeşil, beyaz yazı, ortalanmış)
    sheet.mergeCells(`A${row}:B${row}`);
    sheet.getCell(`A${row}`).value = 'ÇORBALAR';
    sheet.getCell(`A${row}`).font = fontCategory;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`A${row}`).fill = fillGreen;
    sheet.mergeCells(`E${row}:F${row}`);
    sheet.getCell(`E${row}`).value = 'EKMEKLER';
    sheet.getCell(`E${row}`).font = fontCategory;
    sheet.getCell(`E${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`E${row}`).fill = fillGreen;
    sheet.getRow(row).height = 32;
    row++;

    // Çorbalar ve Ekmekler içerik satırları (maksimum 3 satır örnek)
    const corbalar = gunMenus['Çorbalar'] || [];
    const ekmekler = gunMenus['Ekmekler'] || [];
    for (let i = 0; i < Math.max(corbalar.length, ekmekler.length, 4); i++) {
        sheet.getCell(`A${row}`).value = corbalar[i]?.ad ? corbalar[i].ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`A${row}`).font = fontCell;
        sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        // Çorbalar fiyatı
        let corbaFiyat = (corbalar[i] && corbalar[i].fiyat1 !== undefined && corbalar[i].fiyat1 !== null && corbalar[i].fiyat1 !== '') ? corbalar[i].fiyat1 : corbalar[i]?.fiyat;
        formatFiyatCellForExcel(sheet.getCell(`B${row}`), corbaFiyat, corbalar[i]?.ad);
        sheet.getCell(`B${row}`).font = fontCell;
        sheet.getCell(`B${row}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getCell(`E${row}`).value = ekmekler[i]?.ad ? ekmekler[i].ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`E${row}`).font = fontCell;
        sheet.getCell(`E${row}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        // Ekmekler fiyatı (tek fiyat)
        formatFiyatCellForExcel(sheet.getCell(`F${row}`), ekmekler[i]?.fiyat, ekmekler[i]?.ad);
        sheet.getCell(`F${row}`).font = fontCell;
        sheet.getCell(`F${row}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getRow(row).height = 27;
        row++;
    }

    // Ana Yemekler ve İçecekler başlık satırı (yeşil, beyaz yazı, ortalanmış)
    sheet.mergeCells(`A${row}:B${row}`);
    sheet.getCell(`A${row}`).value = 'ANA YEMEKLER';
    sheet.getCell(`A${row}`).font = fontCategory;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`A${row}`).fill = fillGreen;
    sheet.mergeCells(`E${row}:F${row}`);
    sheet.getCell(`E${row}`).value = 'İÇECEKLER';
    sheet.getCell(`E${row}`).font = fontCategory;
    sheet.getCell(`E${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`E${row}`).fill = fillGreen;
    sheet.getRow(row).height = 32;
    row++;

    // Ana Yemekler içerik satırları (sadece ana yemekler kadar satır)
    const anaYemekler = gunMenus['Ana Yemekler'] || [];
    let anaYemeklerRow = anaYemekler.length;
    if (anaYemeklerRow < 5) {
        if(anaYemeklerRow == 4){
            anaYemeklerRow = anaYemeklerRow + 1;
        }else{
            anaYemeklerRow = anaYemeklerRow + 2;
        }
    }
    for (let i = 0; i < anaYemeklerRow; i++) {
        sheet.getCell(`A${row}`).value = anaYemekler[i]?.ad ? anaYemekler[i].ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`A${row}`).font = fontCell;
        sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        let anaFiyat = (anaYemekler[i] && anaYemekler[i].fiyat1 !== undefined && anaYemekler[i].fiyat1 !== null && anaYemekler[i].fiyat1 !== '') ? anaYemekler[i].fiyat1 : anaYemekler[i]?.fiyat;
        formatFiyatCellForExcel(sheet.getCell(`B${row}`), anaFiyat, anaYemekler[i]?.ad);
        sheet.getCell(`B${row}`).font = fontCell;
        sheet.getCell(`B${row}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getRow(row).height = 33;
        row++;
    }

    // İçecekler başlığının hemen altından başlayacak şekilde, her içecek bir satıra yazılacak
    const icecekler = gunMenus['İçecekler'] || [];
    let iceceklerRow = row - anaYemekler.length - 2; // İçecekler başlığının hemen altı
    if (anaYemekler.length >= 5) {
        if(anaYemekler.length == 4){
            iceceklerRow = iceceklerRow + 1;
        }else{
            iceceklerRow = iceceklerRow + 2;
        }
    }else{
        if(anaYemekler.length == 4){
            iceceklerRow = iceceklerRow + 1;
        }
    }

    for (let i = 0; i < icecekler.length; i++) {
        sheet.getCell(`E${iceceklerRow}`).value = icecekler[i]?.ad ? icecekler[i].ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`E${iceceklerRow}`).font = fontCell;
        sheet.getCell(`E${iceceklerRow}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        formatFiyatCellForExcel(sheet.getCell(`F${iceceklerRow}`), icecekler[i]?.fiyat, icecekler[i]?.ad);
        sheet.getCell(`F${iceceklerRow}`).font = fontCell;
        sheet.getCell(`F${iceceklerRow}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getRow(iceceklerRow).height = 25;
        iceceklerRow++;
    }

    // İçeceklerden hemen sonra Tatlı başlığı ve satırları (E ve F sütununda)
    const tatlilar = gunMenus['Tatlılar'] || [];
    // Tatlı başlığı
    sheet.mergeCells(`E${iceceklerRow}:F${iceceklerRow}`);
    sheet.getCell(`E${iceceklerRow}`).value = 'TATLI';
    sheet.getCell(`E${iceceklerRow}`).font = fontCategory;
    sheet.getCell(`E${iceceklerRow}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`E${iceceklerRow}`).fill = fillGreen;
    sheet.getRow(iceceklerRow).height = 33;
    iceceklerRow++;
    // Tatlılar satırları
    for (let i = 0; i < tatlilar.length + 2; i++) {
        sheet.getCell(`E${iceceklerRow}`).value = tatlilar[i]?.ad ? tatlilar[i].ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`E${iceceklerRow}`).font = fontCell;
        sheet.getCell(`E${iceceklerRow}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        formatFiyatCellForExcel(sheet.getCell(`F${iceceklerRow}`), tatlilar[i]?.fiyat, tatlilar[i]?.ad);
        sheet.getCell(`F${iceceklerRow}`).font = fontCell;
        sheet.getCell(`F${iceceklerRow}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getRow(iceceklerRow).height = 25;
        iceceklerRow++;
    }

    // Pilav & Makarna ve Tatlı başlık satırı (yeşil, beyaz yazı, ortalanmış)
    sheet.mergeCells(`A${row}:B${row}`);
    sheet.getCell(`A${row}`).value = 'PİLAV & MAKARNA';
    sheet.getCell(`A${row}`).font = fontCategory;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`A${row}`).fill = fillGreen;
    // Tatlı başlığı ve sütunu kaldırıldı
    sheet.getRow(row).height = 33;
    row++;

    // Pilav & Makarna içerik satırları
    const pilavMakarna = gunMenus['Pilav / Makarna'] || [];
    for (let i = 0; i < pilavMakarna.length + 2; i++) {
        sheet.getCell(`A${row}`).value = pilavMakarna[i]?.ad ? pilavMakarna[i].ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`A${row}`).font = fontCell;
        sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        // Pilav/Makarna fiyatı
        let pilavFiyat = (pilavMakarna[i] && pilavMakarna[i].fiyat1 !== undefined && pilavMakarna[i].fiyat1 !== null && pilavMakarna[i].fiyat1 !== '') ? pilavMakarna[i].fiyat1 : pilavMakarna[i]?.fiyat;
        formatFiyatCellForExcel(sheet.getCell(`B${row}`), pilavFiyat, pilavMakarna[i]?.ad);
        sheet.getCell(`B${row}`).font = fontCell;
        sheet.getCell(`B${row}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getRow(row).height = 25;
        row++;
    }

    // Salata başlığı (yeşil, beyaz yazı, ortalanmış)
    sheet.mergeCells(`A${row}:B${row}`);
    sheet.getCell(`A${row}`).value = 'SALATA';
    sheet.getCell(`A${row}`).font = fontCategory;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`A${row}`).fill = fillGreen;
    sheet.getRow(row).height = 33;
    row++;
    const salatalar = filterForMenuType(gunMenus['Salata'] || [], 'dekanlik');
    for (let i = 0; i < Math.max(salatalar.length, 3); i++) {
        sheet.getCell(`A${row}`).value = salatalar[i]?.ad ? salatalar[i].ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`A${row}`).font = fontCell;
        sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        // Salatalar fiyatı
        let salataFiyat = (salatalar[i] && salatalar[i].fiyat1 !== undefined && salatalar[i].fiyat1 !== null && salatalar[i].fiyat1 !== '') ? salatalar[i].fiyat1 : salatalar[i]?.fiyat;
        formatFiyatCellForExcel(sheet.getCell(`B${row}`), salataFiyat, salatalar[i]?.ad);
        sheet.getCell(`B${row}`).font = fontCell;
        sheet.getCell(`B${row}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getRow(row).height = 25;
        row++;
    }

    // Zeytinyağlılar ve Soğuklar başlığı (yeşil, beyaz yazı, ortalanmış)
    sheet.mergeCells(`A${row}:B${row}`);
    sheet.getCell(`A${row}`).value = 'ZEYTİNYAĞLILAR VE SOĞUKLAR';
    sheet.getCell(`A${row}`).font = fontCategory;
    sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getCell(`A${row}`).fill = fillGreen;
    sheet.getRow(row).height = 33;
    row++;
    const soguklar = gunMenus['Soğuklar'] || [];
    const zeytinSoguk = soguklar.filter(item => item?.ad === "CACIK" || item?.ad === "HAYDARİ");

    // En az 10 satır olacak şekilde doldur
    const targetRows = Math.max(zeytinSoguk.length, 16);
    for (let i = 0; i < targetRows; i++) {
        const item = zeytinSoguk[i];

        sheet.getCell(`A${row}`).value = item?.ad ? item.ad.toLocaleUpperCase('tr-TR') : '';
        sheet.getCell(`A${row}`).font = fontCell;
        sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        // Zeytinyağlılar ve soğuklar fiyatı
        let zeytinFiyat = (zeytinSoguk[i] && zeytinSoguk[i].fiyat1 !== undefined && zeytinSoguk[i].fiyat1 !== null && zeytinSoguk[i].fiyat1 !== '') ? zeytinSoguk[i].fiyat1 : zeytinSoguk[i]?.fiyat;
        formatFiyatCellForExcel(sheet.getCell(`B${row}`), zeytinFiyat, zeytinSoguk[i]?.ad);
        sheet.getCell(`B${row}`).font = fontCell;
        sheet.getCell(`B${row}`).alignment = { vertical: 'middle', horizontal: 'right', wrapText: true };
        sheet.getRow(row).height = 25;
        row++;
    }

    // Kenarlıklar ve son rötuşlar
    for (let r = 1; r < row; r++) {
        for (let c of ['A', 'B', 'C', 'D', 'E', 'F']) {
            const cell = sheet.getCell(`${c}${r}`);
            cell.border = {};
            // 1. satırın üstüne border
            if (r === 1) {
                cell.border = { ...cell.border, top: borderThickest };
            }
            // Son satırın altına border
            if (r === row - 1) {
                cell.border = { ...cell.border, bottom: borderThickest };
            }
            // A sütununun soluna border
            if (c === 'A') {
                cell.border = { ...cell.border, left: borderThickest };
            }
            // F sütununun sağına border
            if (c === 'F') {
                cell.border = { ...cell.border, right: borderThickest };
            }
            // 2. satırın altına border (varsa)
            if (r === 2) {
                cell.border = { ...cell.border, bottom: borderThickest };
            }
            // D sütununun soluna border (orta çizgi)
            if (c === 'D') {
                cell.border = { ...cell.border, left: borderThickest };
            }
            // 3. satırda C ve D hücrelerinin arkaplan rengini kaldır ve sağ border'ı kaldır
            if (r === 3) {
                if (c === 'C' || c === 'D') {
                    cell.fill = undefined;
                    cell.border = { ...cell.border, right: undefined };
                }
            }
            // 1. ve 2. satırda alignment ayarını ASLA değiştirme!
            if (r > 2) {
                const isHeaderRow = cell.fill && cell.fill.type === 'pattern' && cell.fill.pattern === 'solid' && cell.fill.fgColor && cell.fill.fgColor.argb === 'FF92D050';
                if (!isHeaderRow) {
                    cell.alignment = { vertical: 'middle', horizontal: (c === 'B' || c === 'F') ? 'right' : 'left', wrapText: true };
                }
            }
        }
    }

    // Belirli satırların soluna border ekle (A sütunu)
    [1, 3, 8, 14, 18, 22].forEach(r => {
        if (sheet.getCell(`A${r}`)) {
            sheet.getCell(`A${r}`).border = { ...sheet.getCell(`A${r}`).border, left: borderThickest };
        }
    });

    // Sayfa çıktısı A4'e sığacak şekilde ayarlanıyor (Self Menü dahil tüm sayfalar için)
    sheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 1,
        horizontalCentered: true, // Yatay ortalama
        verticalCentered: true, // Dikey ortalama
        margins: {
            left: 0.4724, // 1.2 cm
            right: 0.4724, // 1.2 cm
            top: 0.4724, // 1.2 cm
            bottom: 0.4724, // 1.2 cm
            header: 0,
            footer: 0
        }
    };

    // Yeşil ana başlıkların satır yüksekliğini iki katına çıkar
    for (let r = 1; r < row; r++) {
        const cell = sheet.getCell(`A${r}`);
        if (cell.fill && cell.fill.type === 'pattern' && cell.fill.pattern === 'solid' && cell.fill.fgColor && cell.fill.fgColor.argb === 'FF92D050') {
            const currentHeight = sheet.getRow(r).height || 33;
            sheet.getRow(r).height = currentHeight * 2;
        }
    }
    // Kategori başlıklarının satır yüksekliğini düşür
    // Çorbalar & Ekmekler
    sheet.getRow(3).height = 32;
    // Ana Yemekler & İçecekler
    sheet.getRow(8).height = 32;
    // Pilav & Makarna
    sheet.getRow(14).height = 32;
    // Salata
    sheet.getRow(18).height = 30;
    // Zeytinyağlılar ve Soğuklar
    sheet.getRow(22).height = 32;

    // Menü notu varsa en alta ekle
    if (menu && menu.menuNotes && menu.menuNotes['dekanlik'] && menu.menuNotes['dekanlik'].trim()) {
        row++;
        sheet.mergeCells(`A${row}:F${row}`);
        sheet.getCell(`A${row}`).value = menu.menuNotes['dekanlik'].toLocaleUpperCase('tr-TR');
        sheet.getCell(`A${row}`).font = { name: 'Arial Black', size: 14, bold: true, color: { argb: 'FF000000' } };
        sheet.getCell(`A${row}`).alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        sheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6E6' } };
        sheet.getCell(`A${row}`).border = { top: borderThickest, left: borderThickest, bottom: borderThickest, right: borderThickest };
        sheet.getRow(row).height = 40;
    }
}
// Fiyatı düzgün formatlayan yardımcı fonksiyon
function formatFiyatCell(fiyat) {
    // Fiyat boşsa 0 kabul et
    let num = 0;
    if (fiyat !== undefined && fiyat !== null && fiyat !== '') {
        num = Number(String(fiyat).replace(',', '.'));
        if (isNaN(num)) num = 0;
    }
    return `₺${num.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
}

function formatFiyatCellForExcel(cell, fiyat, ad) {
    // Eğer yemek adı yoksa fiyatı boş bırak
    if (!ad) {
        cell.value = '';
        cell.numFmt = '₺#,##0.00';
        return;
    }
    let num = 0;
    if (fiyat !== undefined && fiyat !== null && fiyat !== '') {
        num = Number(String(fiyat).replace(',', '.'));
        if (isNaN(num)) num = 0;
    }
    cell.value = num;
    cell.numFmt = '₺#,##0.00';

    // Eğer fiyat 0.00 ise hücreyi kırmızıya boya
    if (num === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF0000' } };
    }
}

$(function () {
    loadWeeklyMenus();
    renderWeeklyMenuSelect();
    renderMenuUI();

    // Haftalık menü seçimi
    $('#weekly-menu-select').on('change', function () {
        selectedWeeklyMenuId = $(this).val();
        saveWeeklyMenus();
        // Seçili gün bilgisini yeni menüye göre yükle
        selectedDayIndex = loadSelectedDayIndex(selectedWeeklyMenuId);
        renderMenuUI();
    });

    // Yeni haftalık menü ekle butonu
    $('#add-weekly-menu-btn').on('click', function () {
        $('#weeklyMenuModal').modal('show');
    });

    // Haftalık menü ekleme formu
    $('#modal-weekly-menu-form').off('submit').on('submit', function (e) {
        e.preventDefault();
        const title = $(this).find('input[name="title"]').val();
        const start = $(this).find('input[name="start"]').val();
        const end = $(this).find('input[name="end"]').val();
        const daysArr = getWeekdaysInRange(start, end);
        if (daysArr.length !== 5) {
            alert('Lütfen Pazartesi-Cuma arası tam 5 gün olacak şekilde tarih seçin!');
            return;
        }
        const menus = {};
        daysArr.forEach(day => {
            menus[day.date] = {};
        });

        // Tüm menü notları için varsayılan notları oluştur
        const menuNotes = {};
        sabitMenuler.forEach(m => {
            menuNotes[m.key] = m.defaultNote || '';
        });

        const newMenu = {
            id: 'w' + Date.now(),
            title,
            start,
            end,
            days: daysArr,
            holidays: {},
            menus: menus,
            menuNotes: menuNotes
        };

        // Sabit ürünleri otomatik olarak ekle
        addSabitUrunlerToMenu(newMenu);

        weeklyMenus.push(newMenu);
        selectedWeeklyMenuId = newMenu.id;
        saveWeeklyMenus();
        renderWeeklyMenuSelect();
        renderMenuUI();
        $('#weeklyMenuModal').modal('hide');
        this.reset();
    });

    // Gün butonlarına tıklama
    $('#days-buttons').on('click', 'button', function () {
        const dayIdx = Number($(this).data('day'));
        renderMenuUI(dayIdx);
    });

    // Resmi tatil checkbox
    $('#day-detail').on('change', '.holiday-checkbox', function () {
        const dayIndex = $(this).attr('id').split('-')[1];
        const menu = getSelectedWeeklyMenu();
        const day = menu.days[dayIndex];
        menu.holidays[day.date] = $(this).is(':checked');
        saveWeeklyMenus();
        renderDayDetail(dayIndex);
    });

    // Yemek adı ve fiyat inputlarında değişiklik olunca otomatik kaydet
    $('#day-detail').off('input', '.menu-ad-input').on('input', '.menu-ad-input', function () {
        const baslik = $(this).data('baslik');
        const dayIndex = $(this).data('day');
        const idx = $(this).data('index');
        const menu = getSelectedWeeklyMenu();
        const day = menu.days[dayIndex];

        console.log('Input değişikliği:', { baslik, dayIndex, idx, value: $(this).val() });
        console.log('Menu durumu:', menu);
        console.log('Day durumu:', day);

        if (!menu.menus[day.date] || !menu.menus[day.date][baslik] || !Array.isArray(menu.menus[day.date][baslik]) || !menu.menus[day.date][baslik][idx]) {
            console.error('Menü yapısı bulunamadı:', {
                hasMenus: !!menu.menus[day.date],
                hasBaslik: !!menu.menus[day.date]?.[baslik],
                isArray: Array.isArray(menu.menus[day.date]?.[baslik]),
                hasIndex: !!menu.menus[day.date]?.[baslik]?.[idx]
            });
            return;
        }

        menu.menus[day.date][baslik][idx].ad = $(this).val();
        console.log('Değer kaydedildi:', menu.menus[day.date][baslik][idx]);
        saveWeeklyMenus();
        console.log('localStorage kaydedildi');
    });




    // Ekle butonuna tıklanınca ilgili başlığa boş yemek satırı ekle
    $('#day-detail').off('click', '.add-menu-btn').on('click', '.add-menu-btn', function (e) {
        e.stopPropagation();
        const dayIndex = $(this).data('day');
        const baslik = $(this).data('baslik');
        const menu = getSelectedWeeklyMenu();
        const day = menu.days[dayIndex];
        if (!menu.menus[day.date]) menu.menus[day.date] = {};
        if (!menu.menus[day.date][baslik]) menu.menus[day.date][baslik] = [];

        // 2 fiyat alanı gereken kategoriler için fiyat2 alanını da ekle
        const dualPriceCategories = ['Çorbalar', 'Ana Yemekler', 'Pilav / Makarna', 'Salata', 'Zeytinyağlılar', 'Soğuklar', 'Tatlılar'];
        const needsDualPrice = dualPriceCategories.includes(baslik);

        if (needsDualPrice) {
            menu.menus[day.date][baslik].push({ ad: '', fiyat: '', fiyat2: '' });
        } else {
            menu.menus[day.date][baslik].push({ ad: '', fiyat: '' });
        }

        saveWeeklyMenus();
        // İlgili başlığı açık olarak işaretle
        const collapseId = getCollapseId(dayIndex, baslik);
        enumOpenCollapses[collapseId] = true;
        renderDayDetail(dayIndex);
    });

    // Menü düzenleme (silme)
    $('#day-detail').on('click', '.delete-menu', function (e) {
        e.stopPropagation();
        const baslik = $(this).data('baslik');
        const dayIndex = $(this).data('day');
        const idx = $(this).data('index');
        const menu = getSelectedWeeklyMenu();
        const day = menu.days[dayIndex];
        showConfirmModal('Bu menüyü silmek istediğinize emin misiniz?', function () {
            // Güvenlik kontrolü ekle
            if (!menu.menus[day.date] || !menu.menus[day.date][baslik] || !Array.isArray(menu.menus[day.date][baslik])) {
                console.error('Menü dizisi bulunamadı:', { day: day.date, baslik, menus: menu.menus[day.date] });
                return;
            }
            menu.menus[day.date][baslik].splice(idx, 1);
            if (menu.menus[day.date][baslik].length === 0) delete menu.menus[day.date][baslik];
            saveWeeklyMenus();
            // İlgili başlığı açık olarak işaretle
            const collapseId = getCollapseId(dayIndex, baslik);
            enumOpenCollapses[collapseId] = true;
            renderDayDetail(dayIndex);
        });
    });

    // Modal klavye kısayolları: Enter = onay, Esc = iptal
    $(document).off('keydown.confirmModal').on('keydown.confirmModal', function (e) {
        if ($('#confirmModal').hasClass('show')) {
            if (e.key === 'Enter') {
                e.preventDefault();
                $('#confirmModalOk').trigger('click');
            } else if (e.key === 'Escape') {
                e.preventDefault();
                $('#confirmModal').modal('hide');
            }
        }
    });

    // Haftalık menü silme butonu
    $('#delete-weekly-menu-btn').off('click').on('click', function () {
        const selectedId = $('#weekly-menu-select').val();
        if (!selectedId) {
            alert('Silinecek bir haftalık menü seçiniz!');
            return;
        }
        const menu = weeklyMenus.find(m => m.id === selectedId);
        if (!menu) return;
        showConfirmModal(`\"${menu.title}\" haftasını silmek istediğinize emin misiniz?`, function () {
            const idx = weeklyMenus.findIndex(m => m.id === selectedId);
            if (idx !== -1) {
                weeklyMenus.splice(idx, 1);
                // Eğer silinen menü seçiliyse, başka bir menü seç
                if (selectedWeeklyMenuId === selectedId) {
                    selectedWeeklyMenuId = weeklyMenus.length > 0 ? weeklyMenus[0].id : null;
                }
                saveWeeklyMenus();
                renderWeeklyMenuSelect();
                renderMenuUI();
            }
        });
    });

    // Excel'e Aktar butonları doğrudan export başlatacak, modal açmayacak
    $('#export-daily-excel-btn').off('click').on('click', async function () {
        const menu = getSelectedWeeklyMenu();
        if (!menu) {
            alert('Lütfen önce bir haftalık menü seçiniz!');
            return;
        }
        if (typeof ExcelJS === 'undefined') {
            alert('ExcelJS kütüphanesi yüklü değil!');
            return;
        }
        await exportAllDailyMenusToExcel(menu);
    });

    $('#export-weekly-excel-btn').off('click').on('click', async function () {
        const menu = getSelectedWeeklyMenu();
        if (!menu) {
            alert('Lütfen önce bir haftalık menü seçiniz!');
            return;
        }
        if (typeof ExcelJS === 'undefined') {
            alert('ExcelJS kütüphanesi yüklü değil!');
            return;
        }
        await exportWeeklyMenuToExcel(menu);
    });

    // Menü notları kaydet butonu
    $('#save-menu-notes-btn').off('click').on('click', function () {
        const menu = getSelectedWeeklyMenu();
        if (!menu) {
            alert('Lütfen önce bir haftalık menü seçiniz!');
            return;
        }
        saveMenuNotes(menu);
    });

    // Menü notları modalında Enter tuşu ile kaydet
    $('#menu-notes-form').off('keydown').on('keydown', function (e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            const menu = getSelectedWeeklyMenu();
            if (menu) {
                saveMenuNotes(menu);
            }
        }
    });

    // =================================
    // SABİT ÜRÜNLER YÖNETİMİ
    // =================================

    // Sabit ürünler modal'ını aç
    $('#manage-sabit-urunler-btn').on('click', function () {
        renderSabitUrunlerModal();
        $('#sabitUrunlerModal').modal('show');
    });

    // Sabit ürünler modal'ını render et
    function renderSabitUrunlerModal() {
        const tabContent = $('#sabitUrunlerTabContent');
        tabContent.empty();

        const categories = [
            { key: 'zeytinyaglilar', name: 'Zeytinyağlılar' },
            { key: 'soguklar', name: 'Soğuklar' },
            { key: 'ekmekler', name: 'Ekmekler' },
            { key: 'icecekler', name: 'İçecekler' },
            { key: 'izgaralar', name: 'Izgaralar' },
            { key: 'pideler', name: 'Pideler' }
        ];

        categories.forEach((category, index) => {
            const isActive = index === 0 ? 'show active' : '';
            const urunler = sabitUrunler[category.key] || [];

            // Zeytinyağlılar ve soğuklar için özel tablo (iki fiyat kolonu)
            const hasTwoPrice = category.key === 'zeytinyaglilar' || category.key === 'soguklar';

            const tabPane = $(`
                <div class="tab-pane fade ${isActive}" id="${category.key}" role="tabpanel">
                    <div class="d-flex justify-content-between align-items-center mb-4">
                        <h5 class="mb-0" style="color: var(--primary);">${category.name}</h5>
                        <button class="btn btn-primary btn-sm add-urun-btn" data-category="${category.key}">
                            Ürün Ekle
                        </button>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr style="background: var(--bg-light);">
                                    <th class="fw-semibold" style="color: var(--text-muted);">Ürün Adı</th>
                                    ${hasTwoPrice ?
                    '<th class="fw-semibold" style="color: var(--text-muted);">Self Fiyat (TL)</th><th class="fw-semibold" style="color: var(--text-muted);">Alakart Fiyat (TL)</th>' :
                    '<th class="fw-semibold" style="color: var(--text-muted);">Fiyat (TL)</th>'
                }
                                    <th class="fw-semibold text-center" style="color: var(--text-muted);">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody class="urun-list" data-category="${category.key}">
                                ${renderUrunList(urunler, category.key)}
                            </tbody>
                        </table>
                    </div>
                </div>
            `);

            tabContent.append(tabPane);
        });
    }

    // Ürün listesini render et
    function renderUrunList(urunler, categoryKey) {
        const hasTwoPrice = categoryKey === 'zeytinyaglilar' || categoryKey === 'soguklar';
        const colSpan = hasTwoPrice ? '4' : '3';

        if (!urunler || urunler.length === 0) {
            return `
                <tr>
                    <td colspan="${colSpan}" class="text-center text-muted py-4">
                        Bu kategoride henüz ürün bulunmuyor.<br>
                        <small>Ürün eklemek için yukarıdaki "Ürün Ekle" butonunu kullanın.</small>
                    </td>
                </tr>
            `;
        }

        return urunler.map((urun, index) => {
            if (hasTwoPrice) {
                return `
                    <tr class="align-middle">
                        <td>
                            <input type="text" class="form-control menu-ad-input urun-ad" value="${urun.ad}" data-category="${categoryKey}" data-index="${index}" placeholder="Ürün adı...">
                        </td>
                        <td>
                            <input type="text" class="form-control menu-fiyat-input urun-fiyat" value="${urun.fiyat || ''}" data-category="${categoryKey}" data-index="${index}" placeholder="0,00">
                        </td>
                        <td>
                            <input type="text" class="form-control menu-fiyat-input urun-fiyat2" value="${urun.fiyat2 || ''}" data-category="${categoryKey}" data-index="${index}" placeholder="0,00">
                        </td>
                        <td class="text-center">
                            <button class="btn btn-outline-danger btn-sm delete-urun-btn" data-category="${categoryKey}" data-index="${index}">
                                Sil
                            </button>
                        </td>
                    </tr>
                `;
            } else {
                return `
                    <tr class="align-middle">
                        <td>
                            <input type="text" class="form-control menu-ad-input urun-ad" value="${urun.ad}" data-category="${categoryKey}" data-index="${index}" placeholder="Ürün adı...">
                        </td>
                        <td>
                            <input type="text" class="form-control menu-fiyat-input urun-fiyat" value="${urun.fiyat}" data-category="${categoryKey}" data-index="${index}" placeholder="0,00">
                        </td>
                        <td class="text-center">
                            <button class="btn btn-outline-danger btn-sm delete-urun-btn" data-category="${categoryKey}" data-index="${index}">
                                Sil
                            </button>
                        </td>
                    </tr>
                `;
            }
        }).join('');
    }

    // Ürün ekleme
    $('#sabitUrunlerModal').on('click', '.add-urun-btn', function () {
        const categoryKey = $(this).data('category');
        const tbody = $(`.urun-list[data-category="${categoryKey}"]`);

        if (!sabitUrunler[categoryKey]) {
            sabitUrunler[categoryKey] = [];
        }

        // Zeytinyağlılar ve soğuklar için iki fiyat alanı
        const hasTwoPrice = categoryKey === 'zeytinyaglilar' || categoryKey === 'soguklar';
        const newProduct = hasTwoPrice ?
            { ad: '', fiyat: '', fiyat2: '' } :
            { ad: '', fiyat: '' };

        sabitUrunler[categoryKey].push(newProduct);
        tbody.html(renderUrunList(sabitUrunler[categoryKey], categoryKey));
    });

    // Ürün silme
    $('#sabitUrunlerModal').on('click', '.delete-urun-btn', function () {
        const categoryKey = $(this).data('category');
        const index = $(this).data('index');

        if (sabitUrunler[categoryKey] && sabitUrunler[categoryKey][index]) {
            sabitUrunler[categoryKey].splice(index, 1);
            const tbody = $(`.urun-list[data-category="${categoryKey}"]`);
            tbody.html(renderUrunList(sabitUrunler[categoryKey], categoryKey));
        }
    });

    // Ürün bilgilerini güncelleme
    $('#sabitUrunlerModal').on('input', '.urun-ad, .urun-fiyat, .urun-fiyat2', function () {
        const categoryKey = $(this).data('category');
        const index = $(this).data('index');
        const isAd = $(this).hasClass('urun-ad');
        const isFiyat = $(this).hasClass('urun-fiyat');
        const isFiyat2 = $(this).hasClass('urun-fiyat2');
        const value = $(this).val();

        // Validasyon hatalarını temizle
        $(this).removeClass('is-invalid');

        if (sabitUrunler[categoryKey] && sabitUrunler[categoryKey][index]) {
            if (isAd) {
                sabitUrunler[categoryKey][index].ad = value;
            } else if (isFiyat) {
                // Fiyat alanı için basit format kontrolü
                if (value) {
                    // Türkçe ondalık ayırıcısını kabul et (virgül)
                    const cleanValue = value.replace(',', '.');
                    if (isNaN(parseFloat(cleanValue))) {
                        $(this).addClass('is-invalid');
                        return;
                    }
                }
                sabitUrunler[categoryKey][index].fiyat = value;
            } else if (isFiyat2) {
                // Fiyat2 alanı için basit format kontrolü
                if (value) {
                    // Türkçe ondalık ayırıcısını kabul et (virgül)
                    const cleanValue = value.replace(',', '.');
                    if (isNaN(parseFloat(cleanValue))) {
                        $(this).addClass('is-invalid');
                        return;
                    }
                }
                sabitUrunler[categoryKey][index].fiyat2 = value;
            }
        }
    });

    // Sabit ürünleri kaydet
    $('#save-sabit-urunler-btn').on('click', function () {
        // Validasyon: Boş alanları kontrol et
        let hasEmptyFields = false;
        let hasInvalidFields = false;

        $('.urun-ad, .urun-fiyat, .urun-fiyat2').each(function () {
            const value = $(this).val().trim();
            if (!value) {
                hasEmptyFields = true;
                $(this).addClass('is-invalid');
            } else {
                $(this).removeClass('is-invalid');

                // Fiyat alanları için özel kontrol
                if ($(this).hasClass('urun-fiyat') || $(this).hasClass('urun-fiyat2')) {
                    const cleanValue = value.replace(',', '.');
                    if (isNaN(parseFloat(cleanValue)) || parseFloat(cleanValue) < 0) {
                        hasInvalidFields = true;
                        $(this).addClass('is-invalid');
                    }
                }
            }
        });

        if (hasEmptyFields) {
            showToast('Lütfen tüm alanları doldurun!', 'warning');
            return;
        }

        if (hasInvalidFields) {
            showToast('Lütfen geçerli fiyat değerleri girin!', 'warning');
            return;
        }

        if (saveSabitUrunler(sabitUrunler)) {
            $('#sabitUrunlerModal').modal('hide');
            showToast('Sabit ürünler başarıyla kaydedildi!', 'success');
        } else {
            showToast('Kaydetme sırasında bir hata oluştu!', 'danger');
        }
    });

    // Sabit ürünleri sıfırla
    $('#reset-sabit-urunler-btn').on('click', function () {
        // Modal'ı geçici olarak gizle
        $('#sabitUrunlerModal').modal('hide');

        setTimeout(() => {
            showConfirmModal('Tüm sabit ürünler varsayılan değerlere dönecek. Bu işlem geri alınamaz. Emin misiniz?', function () {
                sabitUrunler = { ...defaultSabitUrunler };
                if (resetSabitUrunler()) {
                    renderSabitUrunlerModal();
                    $('#sabitUrunlerModal').modal('show');
                    showToast('Sabit ürünler varsayılan değerlere döndürüldü!', 'success');
                } else {
                    $('#sabitUrunlerModal').modal('show');
                    showToast('Sıfırlama sırasında bir hata oluştu!', 'danger');
                }
            });
        }, 200);
    });

    // Toast bildirimi göster
    function showToast(message, type = 'info') {
        const toastId = 'toast-' + Date.now();
        const toastHtml = `
            <div class="toast align-items-center text-white bg-${type} border-0" role="alert" id="${toastId}" data-bs-autohide="true" data-bs-delay="3000">
                <div class="d-flex">
                    <div class="toast-body">
                        ${message}
                    </div>
                    <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        // Toast container oluştur/al
        let toastContainer = $('#toast-container');
        if (toastContainer.length === 0) {
            $('body').append('<div id="toast-container" class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 9999;"></div>');
            toastContainer = $('#toast-container');
        }

        toastContainer.append(toastHtml);
        const toast = new bootstrap.Toast(document.getElementById(toastId));
        toast.show();

        // Toast otomatik silinsin
        setTimeout(() => {
            $('#' + toastId).remove();
        }, 4000);
    }


})

// Menü tipine göre filtreleme fonksiyonu
function filterForMenuType(items, menuType) {
    if (menuType === 'self') {
        // Self Menü'de tüm öğeler gösterilir
        return items;
    } else {
        // Diğer menü tiplerinde Salata Bar ve Triliçe gizlenir
        return items.filter(item => {
            const itemAdi = (item?.ad || '').toLowerCase();
            const itemAdiUpper = (item?.ad || '').toUpperCase();

            // Hem küçük hem büyük harfli versiyonları kontrol et
            return !itemAdi.includes('salata bar') &&
                !itemAdi.includes('salata barı') &&
                !itemAdiUpper.includes('SALATA BAR') &&
                !itemAdiUpper.includes('SALATA BARİ')
        });
    }
}

// --- PPTXGENJS SUNUM OLUŞTURUCU (NAZİK, ŞIK, DİKEY) ---
function createMenuPptx(menu) {
    if (typeof window.PptxGenJS === 'undefined') {
        alert('pptxgenjs kütüphanesi yüklü değil!');
        return;
    }
    const gunIndex = typeof selectedDayIndex === 'number' ? selectedDayIndex : 0;
    const day = menu.days[gunIndex];
    if (!day || !menu.menus[day.date]) {
        alert('Seçili gün için menü bulunamadı!');
        return;
    }
    const gunMenus = menu.menus[day.date];
    const tarihBaslik = `${formatTurkishDate(day.date)} ${day.name}`;
    const pptx = new window.PptxGenJS();
    pptx.defineLayout({ name: 'Dikey', width: 9, height: 16 });
    pptx.layout = 'Dikey';
    let slide = pptx.addSlide();

    // ARKA PLAN GÖRSELİ ekle (png)
    slide.addImage({ path: 'assets/ozel-oda-menu-bg.png', x:0, y:0, w:9, h:16 });

    // Kenarlık (siyah dikdörtgen)
    slide.addShape(pptx.ShapeType.rect, {x:0.35, y:0.3, w:8.3, h:15.2, line:{color:'000000',width:1.8}, fill:'transparent'});

    // MENÜ başlık
    slide.addText('MENÜ', {
        x:0.6, y:1.0, w:7.8, h:1,
        align:'center',
        fontSize:48,
        fontFace:'Monotype Corsiva',
        bold:true,
        italic:true,
        color:'222222',
        valign: 'middle'
    });
    const categories = [
        { key:'Çorbalar',    title:'* ÇORBA *' },
        { key:'Salata',      title:'* SALATA *' },
        { key:'Ana Yemekler',title:'* ANA YEMEK *' },
        { key:'Tatlılar',    title:'* TATLI *' }
    ];
    let currentY = 2.3;
    categories.forEach(cat => {
        slide.addText([{ text:cat.title, options:{ fontFace:'Monotype Corsiva', fontSize:28, bold:true, italic:true, color:'222222', underline:true }}], {
            x:0.6, y:currentY, w:7.8, h:0.5,
            align:'center',
            valign: 'middle'
        });
        currentY += 0.55;
        const yemekler = (gunMenus[cat.key]||[]).map(y => (y.ad||'').toLocaleUpperCase('tr-TR')).filter(Boolean);
        if (yemekler.length) {
            slide.addText(yemekler.map(txt => ({ text:txt, options:{ fontFace:'Monotype Corsiva', fontSize:28, italic:true, color:'222222' } })), {
                x:0.6, y:currentY, w:7.8, h:0.5 * yemekler.length,
                align:'center',
                valign: 'middle',
                lineSpacing: '110%'
            });
            currentY += 0.51 * yemekler.length;
        } else {
            currentY += 0.18;
        }
        currentY += 0.16;
    });
    const pptFileName = `Menü-${day.name}.pptx`;
    pptx.writeFile({ fileName: pptFileName });
}
$(document).ready(function(){
  $('#download-pptx-menu-btn').off('click').on('click', function(){
      const menu = getSelectedWeeklyMenu();
      if (!menu) {
          alert('Lütfen bir haftalık menü seçin!');
          return;
      }
      createMenuPptx(menu);
  });
});
