/*!
 * cities.js — справочник городов с координатами для «Намаз-табло».
 * Можно свободно дополнять: { id, name, region, cc, lat, lng [, asr] }.
 * id желательно не менять у уже используемых городов.
 *
 * cc — страна; по ней выбираются метод расчёта и мазхаб по умолчанию
 * (как принято у местного муфтията), см. NamazCities.defaultsFor().
 * asr — мазхаб города, если он отличается от страны (Дагестан, Чечня, Ингушетия — Шафии).
 */
window.CITIES = [
  /* Россия */
  { id: 'abakan',        name: 'Абакан',            region: 'Россия', cc: 'RU', lat: 53.7212, lng: 91.4424 },
  { id: 'almetyevsk',    name: 'Альметьевск',       region: 'Россия', cc: 'RU', lat: 54.9014, lng: 52.2973 },
  { id: 'arkhangelsk',   name: 'Архангельск',       region: 'Россия', cc: 'RU', lat: 64.5393, lng: 40.5181 },
  { id: 'astrakhan',     name: 'Астрахань',         region: 'Россия', cc: 'RU', lat: 46.3497, lng: 48.0408 },
  { id: 'barnaul',       name: 'Барнаул',           region: 'Россия', cc: 'RU', lat: 53.3548, lng: 83.7698 },
  { id: 'bugulma',       name: 'Бугульма',          region: 'Россия', cc: 'RU', lat: 54.5363, lng: 52.7895 },
  { id: 'vladivostok',   name: 'Владивосток',       region: 'Россия', cc: 'RU', lat: 43.1155, lng: 131.8855 },
  { id: 'vladikavkaz',   name: 'Владикавказ',       region: 'Россия', cc: 'RU', lat: 43.0367, lng: 44.6678 },
  { id: 'volgograd',     name: 'Волгоград',         region: 'Россия', cc: 'RU', lat: 48.7080, lng: 44.5133 },
  { id: 'voronezh',      name: 'Воронеж',           region: 'Россия', cc: 'RU', lat: 51.6608, lng: 39.2003 },
  { id: 'grozny',        name: 'Грозный',           region: 'Россия', cc: 'RU', lat: 43.3169, lng: 45.6981, asr: 'standard' },
  { id: 'gudermes',      name: 'Гудермес',          region: 'Россия', cc: 'RU', lat: 43.3519, lng: 46.1036, asr: 'standard' },
  { id: 'derbent',       name: 'Дербент',           region: 'Россия', cc: 'RU', lat: 42.0578, lng: 48.2889, asr: 'standard' },
  { id: 'ekb',           name: 'Екатеринбург',      region: 'Россия', cc: 'RU', lat: 56.8389, lng: 60.6057 },
  { id: 'izhevsk',       name: 'Ижевск',            region: 'Россия', cc: 'RU', lat: 56.8527, lng: 53.2115 },
  { id: 'irkutsk',       name: 'Иркутск',           region: 'Россия', cc: 'RU', lat: 52.2870, lng: 104.3050 },
  { id: 'yoshkarola',    name: 'Йошкар-Ола',        region: 'Россия', cc: 'RU', lat: 56.6344, lng: 47.8999 },
  { id: 'kazan',         name: 'Казань',            region: 'Россия', cc: 'RU', lat: 55.7963, lng: 49.1088 },
  { id: 'kaliningrad',   name: 'Калининград',       region: 'Россия', cc: 'RU', lat: 54.7104, lng: 20.4522 },
  { id: 'kaspiysk',      name: 'Каспийск',          region: 'Россия', cc: 'RU', lat: 42.8817, lng: 47.6385, asr: 'standard' },
  { id: 'kemerovo',      name: 'Кемерово',          region: 'Россия', cc: 'RU', lat: 55.3547, lng: 86.0873 },
  { id: 'kizlyar',       name: 'Кизляр',            region: 'Россия', cc: 'RU', lat: 43.8470, lng: 46.7140, asr: 'standard' },
  { id: 'krasnodar',     name: 'Краснодар',         region: 'Россия', cc: 'RU', lat: 45.0355, lng: 38.9753 },
  { id: 'krasnoyarsk',   name: 'Красноярск',        region: 'Россия', cc: 'RU', lat: 56.0153, lng: 92.8932 },
  { id: 'kurgan',        name: 'Курган',            region: 'Россия', cc: 'RU', lat: 55.4410, lng: 65.3411 },
  { id: 'magas',         name: 'Магас',             region: 'Россия', cc: 'RU', lat: 43.1688, lng: 44.8131, asr: 'standard' },
  { id: 'maykop',        name: 'Майкоп',            region: 'Россия', cc: 'RU', lat: 44.6098, lng: 40.1006 },
  { id: 'makhachkala',   name: 'Махачкала',         region: 'Россия', cc: 'RU', lat: 42.9764, lng: 47.5028, asr: 'standard' },
  { id: 'msk',           name: 'Москва',            region: 'Россия', cc: 'RU', lat: 55.7558, lng: 37.6173 },
  { id: 'murmansk',      name: 'Мурманск',          region: 'Россия', cc: 'RU', lat: 68.9585, lng: 33.0827 },
  { id: 'chelny',        name: 'Набережные Челны',  region: 'Россия', cc: 'RU', lat: 55.7436, lng: 52.3958 },
  { id: 'nazran',        name: 'Назрань',           region: 'Россия', cc: 'RU', lat: 43.2257, lng: 44.7645, asr: 'standard' },
  { id: 'nalchik',       name: 'Нальчик',           region: 'Россия', cc: 'RU', lat: 43.4981, lng: 43.6189 },
  { id: 'nvrb',          name: 'Нижневартовск',     region: 'Россия', cc: 'RU', lat: 60.9344, lng: 76.5531 },
  { id: 'nizhnekamsk',   name: 'Нижнекамск',        region: 'Россия', cc: 'RU', lat: 55.6366, lng: 51.8245 },
  { id: 'nnovgorod',     name: 'Нижний Новгород',   region: 'Россия', cc: 'RU', lat: 56.3269, lng: 44.0059 },
  { id: 'novosibirsk',   name: 'Новосибирск',       region: 'Россия', cc: 'RU', lat: 55.0084, lng: 82.9357 },
  { id: 'nurengoy',      name: 'Новый Уренгой',     region: 'Россия', cc: 'RU', lat: 66.0833, lng: 76.6333 },
  { id: 'nojabrsk',      name: 'Ноябрьск',          region: 'Россия', cc: 'RU', lat: 63.2018, lng: 75.4510 },
  { id: 'omsk',          name: 'Омск',              region: 'Россия', cc: 'RU', lat: 54.9885, lng: 73.3242 },
  { id: 'orenburg',      name: 'Оренбург',          region: 'Россия', cc: 'RU', lat: 51.7727, lng: 55.0988 },
  { id: 'penza',         name: 'Пенза',             region: 'Россия', cc: 'RU', lat: 53.1950, lng: 45.0177 },
  { id: 'perm',          name: 'Пермь',             region: 'Россия', cc: 'RU', lat: 58.0105, lng: 56.2502 },
  { id: 'rostov',        name: 'Ростов-на-Дону',    region: 'Россия', cc: 'RU', lat: 47.2357, lng: 39.7015 },
  { id: 'salehard',      name: 'Салехард',          region: 'Россия', cc: 'RU', lat: 66.5299, lng: 66.6135 },
  { id: 'samara',        name: 'Самара',            region: 'Россия', cc: 'RU', lat: 53.1959, lng: 50.1002 },
  { id: 'spb',           name: 'Санкт-Петербург',   region: 'Россия', cc: 'RU', lat: 59.9343, lng: 30.3351 },
  { id: 'saransk',       name: 'Саранск',           region: 'Россия', cc: 'RU', lat: 54.1838, lng: 45.1749 },
  { id: 'saratov',       name: 'Саратов',           region: 'Россия', cc: 'RU', lat: 51.5336, lng: 46.0343 },
  { id: 'simferopol',    name: 'Симферополь',       region: 'Россия', cc: 'RU', lat: 44.9521, lng: 34.1024 },
  { id: 'sochi',         name: 'Сочи',              region: 'Россия', cc: 'RU', lat: 43.5855, lng: 39.7231 },
  { id: 'stavropol',     name: 'Ставрополь',        region: 'Россия', cc: 'RU', lat: 45.0428, lng: 41.9734 },
  { id: 'sterlitamak',   name: 'Стерлитамак',       region: 'Россия', cc: 'RU', lat: 53.6301, lng: 55.9306 },
  { id: 'surgut',        name: 'Сургут',            region: 'Россия', cc: 'RU', lat: 61.2540, lng: 73.3962 },
  { id: 'tobolsk',       name: 'Тобольск',          region: 'Россия', cc: 'RU', lat: 58.1981, lng: 68.2541 },
  { id: 'tolyatti',      name: 'Тольятти',          region: 'Россия', cc: 'RU', lat: 53.5303, lng: 49.3461 },
  { id: 'tomsk',         name: 'Томск',             region: 'Россия', cc: 'RU', lat: 56.4846, lng: 84.9482 },
  { id: 'tula',          name: 'Тула',              region: 'Россия', cc: 'RU', lat: 54.1961, lng: 37.6182 },
  { id: 'tyumen',        name: 'Тюмень',            region: 'Россия', cc: 'RU', lat: 57.1522, lng: 65.5272 },
  { id: 'ulyanovsk',     name: 'Ульяновск',         region: 'Россия', cc: 'RU', lat: 54.3142, lng: 48.4031 },
  { id: 'ufa',           name: 'Уфа',               region: 'Россия', cc: 'RU', lat: 54.7388, lng: 55.9721 },
  { id: 'khabarovsk',    name: 'Хабаровск',         region: 'Россия', cc: 'RU', lat: 48.4802, lng: 135.0719 },
  { id: 'khmansiysk',    name: 'Ханты-Мансийск',    region: 'Россия', cc: 'RU', lat: 61.0042, lng: 69.0019 },
  { id: 'khasavyurt',    name: 'Хасавюрт',          region: 'Россия', cc: 'RU', lat: 43.2509, lng: 46.5879, asr: 'standard' },
  { id: 'cheboksary',    name: 'Чебоксары',         region: 'Россия', cc: 'RU', lat: 56.1439, lng: 47.2489 },
  { id: 'chelyabinsk',   name: 'Челябинск',         region: 'Россия', cc: 'RU', lat: 55.1644, lng: 61.4368 },
  { id: 'cherkessk',     name: 'Черкесск',          region: 'Россия', cc: 'RU', lat: 44.2269, lng: 42.0466 },
  { id: 'yakutsk',       name: 'Якутск',            region: 'Россия', cc: 'RU', lat: 62.0355, lng: 129.6755 },
  { id: 'yaroslavl',     name: 'Ярославль',         region: 'Россия', cc: 'RU', lat: 57.6261, lng: 39.8845 },

  /* СНГ */
  { id: 'aktobe',        name: 'Актобе',            region: 'СНГ', cc: 'KZ', lat: 50.2839, lng: 57.1670 },
  { id: 'almaty',        name: 'Алматы',            region: 'СНГ', cc: 'KZ', lat: 43.2389, lng: 76.8897 },
  { id: 'andijan',       name: 'Андижан',           region: 'СНГ', cc: 'UZ', lat: 40.7821, lng: 72.3442 },
  { id: 'astana',        name: 'Астана',            region: 'СНГ', cc: 'KZ', lat: 51.1605, lng: 71.4704 },
  { id: 'atyrau',        name: 'Атырау',            region: 'СНГ', cc: 'KZ', lat: 47.0945, lng: 51.9238 },
  { id: 'ashgabat',      name: 'Ашхабад',           region: 'СНГ', cc: 'TM', lat: 37.9601, lng: 58.3261 },
  { id: 'baku',          name: 'Баку',              region: 'СНГ', cc: 'AZ', lat: 40.4093, lng: 49.8671 },
  { id: 'bishkek',       name: 'Бишкек',            region: 'СНГ', cc: 'KG', lat: 42.8746, lng: 74.5698 },
  { id: 'bukhara',       name: 'Бухара',            region: 'СНГ', cc: 'UZ', lat: 39.7681, lng: 64.4556 },
  { id: 'gyanja',        name: 'Гянджа',            region: 'СНГ', cc: 'AZ', lat: 40.6828, lng: 46.3606 },
  { id: 'dushanbe',      name: 'Душанбе',           region: 'СНГ', cc: 'TJ', lat: 38.5598, lng: 68.7870 },
  { id: 'karaganda',     name: 'Караганда',         region: 'СНГ', cc: 'KZ', lat: 49.8047, lng: 73.1094 },
  { id: 'namangan',      name: 'Наманган',          region: 'СНГ', cc: 'UZ', lat: 40.9983, lng: 71.6726 },
  { id: 'osh',           name: 'Ош',                region: 'СНГ', cc: 'KG', lat: 40.5283, lng: 72.7985 },
  { id: 'samarkand',     name: 'Самарканд',         region: 'СНГ', cc: 'UZ', lat: 39.6542, lng: 66.9597 },
  { id: 'tashkent',      name: 'Ташкент',           region: 'СНГ', cc: 'UZ', lat: 41.2995, lng: 69.2401 },
  { id: 'fergana',       name: 'Фергана',           region: 'СНГ', cc: 'UZ', lat: 40.3842, lng: 71.7843 },
  { id: 'khujand',       name: 'Худжанд',           region: 'СНГ', cc: 'TJ', lat: 40.2838, lng: 69.6312 },
  { id: 'shymkent',      name: 'Шымкент',           region: 'СНГ', cc: 'KZ', lat: 42.3417, lng: 69.5901 },

  /* Ближний Восток и Африка */
  { id: 'abudhabi',      name: 'Абу-Даби',          region: 'Ближний Восток и Африка', cc: 'AE', lat: 24.4539, lng: 54.3773 },
  { id: 'algiers',       name: 'Алжир',             region: 'Ближний Восток и Африка', cc: 'DZ', lat: 36.7538, lng: 3.0588 },
  { id: 'amman',         name: 'Амман',             region: 'Ближний Восток и Африка', cc: 'JO', lat: 31.9539, lng: 35.9106 },
  { id: 'doha',          name: 'Доха',              region: 'Ближний Восток и Африка', cc: 'QA', lat: 25.2854, lng: 51.5310 },
  { id: 'dubai',         name: 'Дубай',             region: 'Ближний Восток и Африка', cc: 'AE', lat: 25.2048, lng: 55.2708 },
  { id: 'jeddah',        name: 'Джидда',            region: 'Ближний Восток и Африка', cc: 'SA', lat: 21.4858, lng: 39.1925 },
  { id: 'jerusalem',     name: 'Иерусалим (аль-Кудс)', region: 'Ближний Восток и Африка', cc: 'JO', lat: 31.7780, lng: 35.2354 },
  { id: 'cairo',         name: 'Каир',              region: 'Ближний Восток и Африка', cc: 'EG', lat: 30.0444, lng: 31.2357 },
  { id: 'casablanca',    name: 'Касабланка',        region: 'Ближний Восток и Африка', cc: 'MA', lat: 33.5731, lng: -7.5898 },
  { id: 'kuwait',        name: 'Кувейт',            region: 'Ближний Восток и Африка', cc: 'KW', lat: 29.3759, lng: 47.9774 },
  { id: 'manama',        name: 'Манама',            region: 'Ближний Восток и Африка', cc: 'BH', lat: 26.2285, lng: 50.5860 },
  { id: 'muscat',        name: 'Маскат',            region: 'Ближний Восток и Африка', cc: 'OM', lat: 23.5880, lng: 58.3829 },
  { id: 'medina',        name: 'Медина',            region: 'Ближний Восток и Африка', cc: 'SA', lat: 24.5247, lng: 39.5692 },
  { id: 'mecca',         name: 'Мекка',             region: 'Ближний Восток и Африка', cc: 'SA', lat: 21.3891, lng: 39.8579 },
  { id: 'rabat',         name: 'Рабат',             region: 'Ближний Восток и Африка', cc: 'MA', lat: 34.0209, lng: -6.8416 },
  { id: 'tunis',         name: 'Тунис',             region: 'Ближний Восток и Африка', cc: 'TN', lat: 36.8065, lng: 10.1815 },
  { id: 'riyadh',        name: 'Эр-Рияд',           region: 'Ближний Восток и Африка', cc: 'SA', lat: 24.7136, lng: 46.6753 },

  /* Турция и Азия */
  { id: 'ankara',        name: 'Анкара',            region: 'Турция и Азия', cc: 'TR', lat: 39.9334, lng: 32.8597 },
  { id: 'bursa',         name: 'Бурса',             region: 'Турция и Азия', cc: 'TR', lat: 40.1885, lng: 29.0610 },
  { id: 'dhaka',         name: 'Дакка',             region: 'Турция и Азия', cc: 'BD', lat: 23.8103, lng: 90.4125 },
  { id: 'delhi',         name: 'Дели',              region: 'Турция и Азия', cc: 'IN', lat: 28.6139, lng: 77.2090 },
  { id: 'jakarta',       name: 'Джакарта',          region: 'Турция и Азия', cc: 'ID', lat: -6.2088, lng: 106.8456 },
  { id: 'islamabad',     name: 'Исламабад',         region: 'Турция и Азия', cc: 'PK', lat: 33.6844, lng: 73.0479 },
  { id: 'karachi',       name: 'Карачи',            region: 'Турция и Азия', cc: 'PK', lat: 24.8607, lng: 67.0011 },
  { id: 'kl',            name: 'Куала-Лумпур',      region: 'Турция и Азия', cc: 'MY', lat: 3.1390,  lng: 101.6869 },
  { id: 'lahore',        name: 'Лахор',             region: 'Турция и Азия', cc: 'PK', lat: 31.5204, lng: 74.3587 },
  { id: 'singapore',     name: 'Сингапур',          region: 'Турция и Азия', cc: 'SG', lat: 1.3521,  lng: 103.8198 },
  { id: 'istanbul',      name: 'Стамбул',           region: 'Турция и Азия', cc: 'TR', lat: 41.0082, lng: 28.9784 },

  /* Европа и Америка */
  { id: 'amsterdam',     name: 'Амстердам',         region: 'Европа и Америка', cc: 'NL', lat: 52.3676, lng: 4.9041 },
  { id: 'berlin',        name: 'Берлин',            region: 'Европа и Америка', cc: 'DE', lat: 52.5200, lng: 13.4050 },
  { id: 'brussels',      name: 'Брюссель',          region: 'Европа и Америка', cc: 'BE', lat: 50.8503, lng: 4.3517 },
  { id: 'vienna',        name: 'Вена',              region: 'Европа и Америка', cc: 'AT', lat: 48.2082, lng: 16.3738 },
  { id: 'london',        name: 'Лондон',            region: 'Европа и Америка', cc: 'GB', lat: 51.5074, lng: -0.1278 },
  { id: 'lisbon',        name: 'Лиссабон',          region: 'Европа и Америка', cc: 'PT', lat: 38.7223, lng: -9.1393 },
  { id: 'newyork',       name: 'Нью-Йорк',          region: 'Европа и Америка', cc: 'US', lat: 40.7128, lng: -74.0060 },
  { id: 'paris',         name: 'Париж',             region: 'Европа и Америка', cc: 'FR', lat: 48.8566, lng: 2.3522 },
  { id: 'prague',        name: 'Прага',             region: 'Европа и Америка', cc: 'CZ', lat: 50.0755, lng: 14.4378 },
  { id: 'toronto',       name: 'Торонто',           region: 'Европа и Америка', cc: 'CA', lat: 43.6532, lng: -79.3832 },
  { id: 'sydney',        name: 'Сидней',            region: 'Европа и Америка', cc: 'AU', lat: -33.8688, lng: 151.2093 }
];

/* Метод расчёта и мазхаб по стране — как принято у местного муфтията.
   Углы методов — по справочнику AlAdhan (api.aladhan.com/v1/methods).
   verified: false — опубликованных углов муфтията страны не нашли,
   стоит сверить с местным расписанием и при необходимости дать поправки. */
window.NamazCities = (function () {
  'use strict';
  var BY_COUNTRY = {
    RU: { method: 'russia',    asr: 'hanafi',   authority: 'ДУМ России' },
    KZ: { method: 'mwl',       asr: 'hanafi',   authority: 'ДУМ Казахстана', verified: false },
    UZ: { method: 'mwl',       asr: 'hanafi',   authority: 'Управление мусульман Узбекистана', verified: false },
    KG: { method: 'mwl',       asr: 'hanafi',   authority: 'ДУМ Кыргызстана', verified: false },
    TJ: { method: 'mwl',       asr: 'hanafi',   authority: 'Совет улемов Таджикистана', verified: false },
    TM: { method: 'mwl',       asr: 'hanafi',   authority: 'Муфтият Туркменистана', verified: false },
    AZ: { method: 'mwl',       asr: 'hanafi',   authority: 'Управление мусульман Кавказа', verified: false },
    TR: { method: 'turkey',    asr: 'hanafi',   authority: 'Диянет' },
    SA: { method: 'ummAlQura', asr: 'standard', authority: 'Умм аль-Кура' },
    AE: { method: 'gulf',      asr: 'standard', authority: 'страны Залива' },
    BH: { method: 'gulf',      asr: 'standard', authority: 'страны Залива' },
    OM: { method: 'gulf',      asr: 'standard', authority: 'страны Залива' },
    QA: { method: 'qatar',     asr: 'standard', authority: 'Катар' },
    KW: { method: 'kuwait',    asr: 'standard', authority: 'Кувейт' },
    EG: { method: 'egypt',     asr: 'standard', authority: 'EGAS' },
    JO: { method: 'jordan',    asr: 'standard', authority: 'Министерство вакуфов Иордании' },
    TN: { method: 'tunisia',   asr: 'standard', authority: 'Тунис' },
    DZ: { method: 'algeria',   asr: 'standard', authority: 'Алжир' },
    MA: { method: 'morocco',   asr: 'standard', authority: 'Марокко' },
    PK: { method: 'karachi',   asr: 'hanafi',   authority: 'Карачи' },
    IN: { method: 'karachi',   asr: 'hanafi',   authority: 'Карачи' },
    BD: { method: 'karachi',   asr: 'hanafi',   authority: 'Карачи' },
    MY: { method: 'jakim',     asr: 'standard', authority: 'JAKIM' },
    ID: { method: 'kemenag',   asr: 'standard', authority: 'KEMENAG' },
    SG: { method: 'singapore', asr: 'standard', authority: 'MUIS' },
    US: { method: 'isna',      asr: 'standard', authority: 'ISNA' },
    CA: { method: 'isna',      asr: 'standard', authority: 'ISNA' },
    FR: { method: 'france',    asr: 'standard', authority: 'UOIF' },
    PT: { method: 'portugal',  asr: 'standard', authority: 'Исламская община Лиссабона' }
  };
  var FALLBACK = { method: 'mwl', asr: 'standard', authority: 'Всемирная мусульманская лига' };

  function find(id) {
    var list = window.CITIES || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /* { method, asr, authority, verified } для города */
  function defaultsFor(city) {
    var d = (city && BY_COUNTRY[city.cc]) || FALLBACK;
    return {
      method: d.method,
      asr: (city && city.asr) || d.asr,
      authority: d.authority,
      verified: d.verified !== false
    };
  }

  /* ближайший город из справочника: { city, km } */
  function nearest(lat, lng) {
    var best = null, bestD = Infinity;
    (window.CITIES || []).forEach(function (c) {
      var dy = (c.lat - lat) * 111, dx = (c.lng - lng) * 111 * Math.cos(lat * Math.PI / 180);
      var d = Math.sqrt(dy * dy + dx * dx);
      if (d < bestD) { bestD = d; best = c; }
    });
    return best ? { city: best, km: bestD } : null;
  }

  return { find: find, defaultsFor: defaultsFor, nearest: nearest };
})();
