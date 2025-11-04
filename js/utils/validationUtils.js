// ============ VALIDATION UTILITY FUNCTIONS ============

/**
 * Fiyat inputları için validation ekleme
 * @param {string} selector - jQuery selector
 */
function addPriceValidation(selector) {
    // Fiyat inputuna sadece sayı ve virgül girişine izin ver
    $('#day-detail').off('keypress', selector).on('keypress', selector, function (e) {
        const char = String.fromCharCode(e.which);
        if (!/[0-9,]/.test(char)) {
            e.preventDefault();
        }
    });
    
    // Kopyala-yapıştır ile harf gelirse de engelle
    $('#day-detail').off('input', selector).on('input', selector, function (e) {
        let val = $(this).val();
        val = val.replace(/[^0-9,]/g, '');
        $(this).val(val);
    });
}

/**
 * Enter tuşu navigation helper
 * @param {string} fromSelector - Başlangıç selector
 * @param {string} toSelector - Hedef selector(s) - virgülle ayrılabilir
 */
function addEnterNavigation(fromSelector, toSelector) {
    $('#day-detail').off('keydown', fromSelector).on('keydown', fromSelector, function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Birden fazla selector'u try et
            const selectors = toSelector.split(',').map(s => s.trim());
            let targetInput = null;
            
            for (let selector of selectors) {
                targetInput = $(this).closest('li').find(selector);
                if (targetInput.length) break;
            }
            
            if (targetInput && targetInput.length) {
                targetInput.focus();
                targetInput.select();
            }
        }
    });
}

/**
 * Sonraki li'ye geçiş için Enter navigation
 * @param {string} fromSelector - Başlangıç selector
 * @param {string} toSelector - Hedef selector
 */
function addEnterNavigationToNext(fromSelector, toSelector) {
    $('#day-detail').off('keydown', fromSelector).on('keydown', fromSelector, function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const nextLi = $(this).closest('li').next('li');
            if (nextLi.length) {
                const nextInput = nextLi.find(toSelector);
                if (nextInput.length) {
                    nextInput.focus();
                    nextInput.select();
                }
            }
        }
    });
}