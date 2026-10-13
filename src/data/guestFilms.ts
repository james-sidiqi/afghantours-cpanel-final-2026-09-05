// Films by a former guest, embedded with the creator's permission (requested by James Sidiqi, Oct 2026).
// Titles below are our own captions; the creator's original titles are kept in `sourceTitle`.
export const GUEST_FILM_CHANNEL = {
  name: 'Cosmopolitan Canadian',
  url: 'https://www.youtube.com/@TheCosmopolitanCanadian',
};

export interface GuestFilm {
  id: string;
  caption: string;
  place: string;
  sourceTitle: string;
  pages: string[]; // route keys, e.g. 'about', 'hub:kabul-city', 'tour:winter-circuit', 'activity:skiing'
}

export const GUEST_FILMS: GuestFilm[] = [
  { id: 'MI8hSJe7g-k', caption: 'Flying in and first days in Afghanistan', place: 'Kabul', sourceTitle: 'I Flew to Afghanistan in 2024', pages: ['about'] },
  { id: 'fh6s-ffN16E', caption: 'Seeing Kabul as a visitor', place: 'Kabul', sourceTitle: 'Kabul Tourism in 2024', pages: ['about', 'hub:kabul-city', 'tour:weekend-in-kabul', 'tour:kabul-surroundings'] },
  { id: 'r90wj5eukwI', caption: 'Living like a local in Kabul', place: 'Kabul', sourceTitle: 'I Lived like a Local in Kabul', pages: ['about', 'hub:kabul-city', 'tour:weekend-in-kabul'] },
  { id: '-kgzH7XtxN0', caption: 'The Buddha niches of Bamyan', place: 'Bamyan', sourceTitle: "Buddhas of Bamyan in Taliban's Afghanistan", pages: ['about', 'hub:bamyan-city', 'tour:winter-circuit', 'tour:bamyan-skiing-tour'] },
  { id: 'F_NkPf9OCnA', caption: 'Skiing the slopes of Bamyan', place: 'Bamyan', sourceTitle: "Skiing in Taliban's Afghanistan (Crazy Experience)", pages: ['about', 'hub:bamyan-city', 'activity:skiing', 'tour:bamyan-skiing-tour', 'tour:ski-expeditions', 'tour:winter-circuit'] },
];

export const filmsFor = (key: string) => GUEST_FILMS.filter((f) => f.pages.includes(key));
