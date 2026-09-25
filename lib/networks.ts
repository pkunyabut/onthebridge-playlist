/**
 * Thai TV channels and Asian streaming platforms that JustWatch does not cover in
 * Thailand. TMDB records the "network" a series first aired on, so we can list shows
 * per channel and tell users which app the channel uses.
 *
 * Network ids checked on themoviedb.org 2026-09-25 (show counts then): ช่อง 3 344 (636),
 * ช่อง 7 180 (505), one31 1784 (341), GMM25 1974 (270), Thai PBS 1018 (45),
 * Workpoint 2937 (40), Amarin 3281 (37), Mono29 2660 (22), AIS Play 3489 (27),
 * TrueID 5319 (38), WeTV 3732 (186) + Tencent Video 2007 (2,705),
 * iQIYI 1330 (2,651) + iQIYI International 6316 (118), Youku 1419 (1,659).
 *
 * Note: a network is where a show FIRST aired, not necessarily where it streams today.
 */
export interface NetworkOption {
  /** our key — label comes from i18n `network_<key>` */
  key: string;
  tmdbIds: number[];
  /** the channel's own app / site */
  app: { name: string; url: string };
}

export const NETWORKS: NetworkOption[] = [
  { key: 'ch3', tmdbIds: [344], app: { name: 'CH3Plus', url: 'https://ch3plus.com/' } },
  { key: 'ch7', tmdbIds: [180], app: { name: 'CH7HD', url: 'https://www.ch7.com/th/' } },
  { key: 'one31', tmdbIds: [1784], app: { name: 'oneD', url: 'https://www.oned.net/' } },
  { key: 'gmm25', tmdbIds: [1974], app: { name: 'GMM25', url: 'https://www.gmm25.com/' } },
  { key: 'thaipbs', tmdbIds: [1018], app: { name: 'VIPA', url: 'https://www.vipa.me/th' } },
  { key: 'workpoint', tmdbIds: [2937], app: { name: 'Workpoint (YouTube)', url: 'https://www.youtube.com/@WorkpointOfficial' } },
  { key: 'amarin', tmdbIds: [3281], app: { name: 'Amarin TV', url: 'https://www.amarintv.com/' } },
  { key: 'mono29', tmdbIds: [2660], app: { name: 'MONOMAX', url: 'https://www.monomax.me/' } },
  { key: 'ais_play', tmdbIds: [3489], app: { name: 'AIS PLAY', url: 'https://aisplay.ais.th/' } },
  { key: 'trueid', tmdbIds: [5319], app: { name: 'TrueID', url: 'https://www.trueid.net/' } },
  { key: 'wetv', tmdbIds: [3732, 2007], app: { name: 'WeTV', url: 'https://wetv.vip/th' } },
  { key: 'iqiyi', tmdbIds: [1330, 6316], app: { name: 'iQIYI', url: 'https://www.iq.com/' } },
  { key: 'youku', tmdbIds: [1419], app: { name: 'Youku', url: 'https://youku.tv/' } },
];

export function getNetwork(key: string): NetworkOption | undefined {
  return NETWORKS.find((n) => n.key === key);
}

export function networkForTmdbId(id: number): NetworkOption | undefined {
  return NETWORKS.find((n) => n.tmdbIds.includes(id));
}
