// ============ DATE UTILITY FUNCTIONS ============

/**
 * Türkçe tarih formatını döndürür
 * @param {string} dateStr - Tarih string'i
 * @returns {string} - Türkçe formatlanmış tarih
 */
function formatTurkishDate(dateStr) {
    // '2025-06-23' veya '23.06.2025' gibi string alır, Türkçe okunabilir döndürür
    let d = dateStr.includes('-') ? new Date(dateStr) : dateStr.split('.').reverse().join('-');
    d = new Date(d);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/**
 * Hafta içi günleri döndürür
 * @param {Date} startDate - Başlangıç tarihi
 * @param {Date} endDate - Bitiş tarihi
 * @returns {Array} - Hafta içi günler dizisi
 */
function getWeekdaysInRange(startDate, endDate) {
    const days = [];
    let current = new Date(startDate);
    endDate = new Date(endDate);
    while (current <= endDate) {
        const dayNum = current.getDay();
        // Pazartesi (1) - Cuma (5)
        if (dayNum >= 1 && dayNum <= 5) {
            days.push({
                name: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][dayNum],
                date: current.toLocaleDateString('tr-TR')
            });
        }
        current.setDate(current.getDate() + 1);
    }
    return days;
}