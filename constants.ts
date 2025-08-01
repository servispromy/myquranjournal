import { TadabburLevel, TadabburDifficulty, TadabburLevelDetail } from './types';

export const APP_VERSION = "2.2.8";
export const TOTAL_QURAN_VERSES = 6236;
export const TOTAL_QURAN_PAGES = 604;

export const SURAH_NAMES: string[] = [
  "Al-Fatihah", "Al-Baqarah", "Aal-e-Imran", "An-Nisa", "Al-Ma'idah", "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Tawbah", "Yunus", "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra", "Al-Kahf", "Maryam", "Taha", "Al-Anbiya", "Al-Hajj", "Al-Muminun", "An-Nur", "Al-Furqan", "Ash-Shu'ara", "An-Naml", "Al-Qasas", "Al-Ankabut", "Ar-Rum", "Luqman", "As-Sajdah", "Al-Ahzab", "Saba", "Fatir", "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir", "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah", "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf", "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid", "Al-Mujadila", "Al-Hashr", "Al-Mumtahanah", "As-Saff", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun", "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij", "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyamah", "Al-Insan", "Al-Mursalat", "An-Naba", "An-Nazi'at", "Abasa", "At-Takwir", "Al-infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Balad", "Ash-Shams", "Al-Lail", "Ad-Duha", "Ash-Sharh", "At-Tin", "Al-Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-Adiyat", "Al-Qari'ah", "At-Takathur", "Al-Asr", "Al-Humazah", "Al-Fil", "Quraysh", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr", "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas"
];

export const SURAH_VERSE_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6
];

export const TADABBUR_DIFFICULTY_LEVELS: { [key in TadabburDifficulty]: TadabburLevel[] } = {
  easy: [TadabburLevel.L1, TadabburLevel.L2],
  intermediate: [TadabburLevel.L3, TadabburLevel.L4],
  high: [TadabburLevel.L5, TadabburLevel.L6, TadabburLevel.L7],
  comprehensive: [TadabburLevel.L8],
};

export const TADABBUR_LEVELS: { [key in TadabburLevel]: TadabburLevelDetail } = {
  [TadabburLevel.L1]: { title: 'Verse-Specific', description: 'Reflect on a single verse.' },
  [TadabburLevel.L2]: { title: 'Contextual', description: 'Reflect on the verse with its preceding and succeeding verses.' },
  [TadabburLevel.L3]: { title: 'Surah Name Connection', description: 'Connect the verse\'s message to the name of the Surah.' },
  [TadabburLevel.L4]: { title: 'Thematic', description: 'Explain how this verse contributes to the central theme of the Surah.' },
  [TadabburLevel.L5]: { title: 'Surah Arc', description: 'Analyze the verse in light of the Surah\'s opening and concluding verses/themes.' },
  [TadabburLevel.L6]: { title: 'Keyword Analysis', description: 'Identify a key Arabic word in the verse and trace its usage elsewhere.' },
  [TadabburLevel.L7]: { title: 'Conceptual Deep Dive', description: 'Identify a core Islamic concept in the verse and discuss it with reference to other verses.' },
  [TadabburLevel.L8]: { title: 'Comprehensive Analysis', description: 'Perform a multi-layered analysis including context, themes, concepts, and provide one authentic, relevant Hadith (text, translation, source).' },
};

export const AGE_OPTIONS = Array.from({ length: 91 }, (_, i) => String(10 + i));

export const COUNTRIES = ["Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi","Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo, Democratic Republic of the","Congo, Republic of the","Costa Rica","Cote d'Ivoire","Croatia","Cuba","Cyprus","Czechia","Denmark","Djibouti","Dominica","Dominican Republic","Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia","Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hungary","Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan","Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine State","Panama","Papua new guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania","Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine","United Arab Emirates","United Kingdom","United States of America","Uruguay","Uzbekistan","Vanuatu","Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe"];

export const USER_ROLES = [
    { id: 'huffaz', icon: '🧠' },
    { id: 'daie', icon: '🗣️' },
    { id: 'father', icon: '🧔' },
    { id: 'mother', icon: '👩' },
    { id: 'grandparent', icon: '👵' },
    { id: 'child', icon: '👦' },
    { id: 'spouse', icon: '🧕' },
    { id: 'gov_servant', icon: '🧑‍💼' },
    { id: 'educator', icon: '🧑‍🏫' },
    { id: 'student', icon: '🧑‍🎓' },
    { id: 'head_of_family', icon: '👥' },
    { id: 'other', icon: '✨' },
];

export const BOOKMARK_COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef'];

export const TAFSIR_AUTHORS = ['Ibn Kathir', 'Maarif Ul Quran', 'Tazkirul Quran'];

export const RECITERS = [
  { id: '1', name: 'Mishary Rashid Al Afasy' },
  { id: '2', name: 'Abu Bakr Al Shatri' },
  { id: '3', name: 'Nasser Al Qatami' },
  { id: '4', name: 'Yasser Al Dosari' },
  { id: '5', name: 'Hani Ar Rifai' },
];