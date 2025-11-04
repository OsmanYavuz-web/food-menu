// ============ PRICE UTILITY FUNCTIONS ============

/**
 * Fiyat formatını normalize eden global fonksiyon
 * @param {string|number} fiyat - Normalize edilecek fiyat
 * @returns {number} - Normalize edilmiş fiyat
 */
function normalizeFiyat(fiyat) {
    if (typeof fiyat === 'string') {
        // String fiyatı sayıya çevir (virgülü noktaya çevir)
        return parseFloat(fiyat.replace(',', '.'));
    }
    return fiyat;
}

/**
 * Kategoriye sabit ürün ekleme helper
 * @param {Object} menu - Menü objesi
 * @param {string} dayDate - Gün tarihi
 * @param {string} categoryName - Kategori adı
 * @param {Array} sabitUrunler - Sabit ürünler listesi
 */
function addSabitUrunToCategory(menu, dayDate, categoryName, sabitUrunler) {
    if (!menu.menus[dayDate][categoryName]) menu.menus[dayDate][categoryName] = [];
    
    sabitUrunler.forEach(urun => {
        const existingIndex = menu.menus[dayDate][categoryName].findIndex(item => item.ad === urun.ad);
        if (existingIndex === -1) {
            // Ürün yoksa ekle
            const newItem = { 
                ad: urun.ad, 
                fiyat: normalizeFiyat(urun.fiyat) 
            };
            // Eğer fiyat2 varsa ekle (zeytinyağlılar ve soğuklar için)
            if (urun.fiyat2 !== undefined && urun.fiyat2 !== null && urun.fiyat2 !== '') {
                newItem.fiyat2 = normalizeFiyat(urun.fiyat2);
            }
            menu.menus[dayDate][categoryName].push(newItem);
        } else {
            // Ürün varsa fiyatını güncelle
            menu.menus[dayDate][categoryName][existingIndex].fiyat = normalizeFiyat(urun.fiyat);
            // Eğer fiyat2 varsa güncelle
            if (urun.fiyat2 !== undefined && urun.fiyat2 !== null && urun.fiyat2 !== '') {
                menu.menus[dayDate][categoryName][existingIndex].fiyat2 = normalizeFiyat(urun.fiyat2);
            }
        }
    });
}