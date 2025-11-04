// Sabit menü tipleri - Excel export ve notlar için kullanılacak
const sabitMenuler = [
    { 
        key: 'self', 
        label: 'SELF MENÜ',
        defaultNote: 'SELF SALONU 11:45 - 13:30 SAATLERİ ARASINDA HİZMET VERMEKTEDİR.'
    },
    { 
        key: 'alakartDikey', 
        label: 'ALAKART MENÜ DİKEY',
        defaultNote: 'LEYLAK SALONU 07:00 - 20:00 SAATLERİ ARASINDA HİZMET VERMEKTEDİR.'
    },
    { 
        key: 'alakartYatay', 
        label: 'ALAKART MENÜ YATAY',
        defaultNote: 'LEYLAK SALONU 07:00 - 20:00 SAATLERİ ARASINDA HİZMET VERMEKTEDİR. IZGARA HİZMETİ 17:15 DEN SONRA BAŞLAMAKTADIR.'
    },
    { 
        key: 'dekanlik', 
        label: 'DEKANLIK MENÜ',
        defaultNote: 'DEKANLIK 11:45 - 13:30 SAATLERİ ARASINDA HİZMET VERMEKTEDİR.'
    },
    { 
        key: 'pide', 
        label: 'PİDE MENÜ',
        defaultNote: 'AİLELER ÖNCELİKLİDİR.\nÖĞRENCİYE ÖĞLEN VE 2\'DEN FAZLA PİDE SATIŞIMIZ YOKTUR.\n\nÇALIŞMA SAATLERİ\n11:30-14:00\n16:30-20:00'
    }
];

// Anahtar-değer objesi olarak da erişim için
const sabitMenulerObj = {};
sabitMenuler.forEach(m => { sabitMenulerObj[m.key] = m.label; });


// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { sabitMenuler, sabitMenulerObj };
} 