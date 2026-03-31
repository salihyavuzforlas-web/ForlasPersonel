export const CITY_DISTRICTS: Record<string, string[]> = {
  Istanbul: ['Kadikoy', 'Besiktas', 'Sisli', 'Bakirkoy', 'Uskudar', 'Pendik', 'Tuzla', 'Esenyurt'],
  Ankara: ['Cankaya', 'Kecioren', 'Yenimahalle', 'Mamak', 'Sincan', 'Etimesgut', 'Pursaklar'],
  Izmir: ['Konak', 'Bornova', 'Karabaglar', 'Buca', 'Karsiyaka', 'Bayrakli', 'Menemen', 'Aliaga'],
  Bursa: ['Osmangazi', 'Nilufer', 'Yildirim', 'Inegol', 'Gursu', 'Gemlik'],
  Kocaeli: ['Izmit', 'Gebze', 'Darica', 'Korfez', 'Golcuk', 'Kartepe'],
  Tekirdag: ['Corlu', 'Cerkezkoy', 'Suleymanpasa', 'Malkara'],
  Sakarya: ['Adapazari', 'Akyazi', 'Serdivan', 'Hendek'],
  Antalya: ['Muratpasa', 'Kepez', 'Konyaalti', 'Dosemealti', 'Alanya', 'Manavgat'],
  Adana: ['Seyhan', 'Cukurova', 'Yuregir', 'Sariçam', 'Ceyhan'],
  Mersin: ['Mezitli', 'Toroslar', 'Akdeniz', 'Tarsus', 'Erdemli'],
  Gaziantep: ['Sehitkamil', 'Sahinbey', 'Nizip', 'Islahiye'],
  Konya: ['Selcuklu', 'Meram', 'Karatay', 'Eregli'],
  Kayseri: ['Melikgazi', 'Kocasinan', 'Talas', 'Incesu'],
  Manisa: ['Yunusemre', 'Sehzadeler', 'Akhisar', 'Soma', 'Salihli'],
  Balikesir: ['Altieylul', 'Karesi', 'Bandirma', 'Edremit'],
  Denizli: ['Pamukkale', 'Merkezefendi', 'Honaz', 'Civril'],
  Samsun: ['Ilkadim', 'Atakum', 'Canik', 'Tekkekoy', 'Bafra'],
  Trabzon: ['Ortahisar', 'Akcaabat', 'Arsin', 'Of'],
  Hatay: ['Antakya', 'Defne', 'Iskenderun', 'Dortyol'],
  Eskisehir: ['Tepebasi', 'Odunpazari', 'Sivrihisar'],
};

export const CITY_INDUSTRIAL_ZONES: Record<string, string[]> = {
  Istanbul: ['Ikitelli OSB', 'Dudullu OSB', 'Tuzla Deri OSB', 'Beylikduzu Sanayi Sitesi'],
  Ankara: ['OSTIM OSB', 'Ivedik OSB', 'Baskent OSB', 'Sincan OSB'],
  Izmir: ['Ataturk OSB', 'Aliaga Kimya Ihtisas OSB', 'Pancar OSB', 'Kemalpasa OSB'],
  Bursa: ['Bursa OSB', 'Nilufer OSB', 'Demirtas OSB', 'Inegol OSB'],
  Kocaeli: ['Gebze OSB', 'Dilovasi OSB', 'TOSB', 'Asim Kibir OSB'],
  Tekirdag: ['Corlu Deri OSB', 'Cerkezkoy OSB', 'Velikoy OSB', 'Muratli OSB'],
  Sakarya: ['Sakarya 1. OSB', 'Arifiye OSB', 'Ferizli OSB'],
  Antalya: ['Antalya OSB', 'Dosemealti Sanayi Sitesi', 'Korkuteli OSB'],
  Adana: ['Adana Haci Sabanci OSB', 'Ceyhan OSB', 'Kozan OSB'],
  Mersin: ['Mersin Tarsus OSB', 'Silifke OSB', 'Erdemli OSB'],
  Gaziantep: ['Gaziantep OSB', 'Nizip OSB', 'Baspinar OSB'],
  Konya: ['Konya OSB', 'Buyukkayacik OSB', 'Karatay Sanayi'],
  Kayseri: ['Kayseri OSB', 'Incesu OSB', 'Mimar Sinan OSB'],
  Manisa: ['Manisa OSB', 'Akhisar OSB', 'Soma OSB'],
  Balikesir: ['Balikesir OSB', 'Bandirma OSB', 'Gonen Deri OSB'],
  Denizli: ['Denizli OSB', 'Honaz OSB', 'Mermer Ihtisas OSB'],
  Samsun: ['Samsun Merkez OSB', 'Kavak OSB', 'Bafra OSB'],
  Trabzon: ['Arsin OSB', 'Besikduzu OSB', 'Vakfikebir OSB'],
  Hatay: ['Iskenderun OSB', 'Payas OSB', 'Erzin OSB'],
  Eskisehir: ['Eskisehir OSB', 'Sivrihisar OSB', 'Beylikova Tarima Dayali OSB'],
};

export const buildRouteLocationOptions = (cities: string[]): string[] => {
  const options: string[] = [];
  const seen = new Set<string>();

  const pushUnique = (value: string) => {
    if (!value || seen.has(value)) return;
    seen.add(value);
    options.push(value);
  };

  cities.forEach((city) => {
    pushUnique(city);
    (CITY_DISTRICTS[city] || []).forEach((district) => pushUnique(`${city} / ${district}`));
    (CITY_INDUSTRIAL_ZONES[city] || []).forEach((industry) =>
      pushUnique(`${city} / Sanayi - ${industry}`)
    );
  });

  return options;
};

export const getCityFromLocationLabel = (value: string): string => {
  if (!value) return '';
  const [cityPart] = value.split('/');
  return cityPart.trim();
};
