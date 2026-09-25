/**
 * Thai TV channels and Asian streaming platforms that JustWatch does not cover in
 * Thailand. TMDB records the "network" a series first aired on, so we can list shows
 * per channel and tell users which app the channel uses.
 *
 * Network ids checked on themoviedb.org 2026-09-25 (show counts then): ช่อง 3 344 (636),
 * ช่อง 7 180 (505), one31 1784 (341), GMM25 1974 (270), Thai PBS 1018 (45),
 * Workpoint 2937 (40), Amarin 3281 (37), Mono29 2660 (22), AIS Play 3489 (27),
 * TrueID 5319 (38), WeTV 3732 (186) + Tencent Video 2007 (2,705),
 * iQIYI 1330 (2,651) + iQIYI International 6316 (118), Youku 1419 (1,659),
 * Viu Thailand 2980 (64) + Viu Korea 8922 + Viu Hong Kong 9261 (other Viu regions — IN, JO,
 * PK, PH — don't stream in Thailand). JustWatch does list Viu, but only for its catalogue;
 * Viu Originals are grouped here with the other Asian platforms users expect to find.
 *
 * Note: a network is where a show FIRST aired, not necessarily where it streams today.
 */
import type { PlatformType } from '@/lib/types';

export interface NetworkOption {
  /** our key — label comes from i18n `network_<key>` */
  key: string;
  tmdbIds: number[];
  /** the channel's own app / site */
  app: { name: string; url: string };
  /** platform value stored when a show from this channel is saved */
  platform: PlatformType;
}

export const NETWORKS: NetworkOption[] = [
  { key: 'ch3', tmdbIds: [344], app: { name: 'CH3Plus', url: 'https://ch3plus.com/' }, platform: 'ch3plus' },
  { key: 'ch7', tmdbIds: [180], app: { name: 'CH7HD', url: 'https://www.ch7.com/th/' }, platform: 'ch7' },
  { key: 'one31', tmdbIds: [1784], app: { name: 'oneD', url: 'https://www.oned.net/' }, platform: 'oned' },
  { key: 'gmm25', tmdbIds: [1974], app: { name: 'GMM25', url: 'https://www.gmm25.com/' }, platform: 'gmm25' },
  { key: 'thaipbs', tmdbIds: [1018], app: { name: 'VIPA', url: 'https://www.vipa.me/th' }, platform: 'vipa' },
  { key: 'workpoint', tmdbIds: [2937], app: { name: 'Workpoint (YouTube)', url: 'https://www.youtube.com/@WorkpointOfficial' }, platform: 'workpoint' },
  { key: 'amarin', tmdbIds: [3281], app: { name: 'Amarin TV', url: 'https://www.amarintv.com/' }, platform: 'amarin' },
  { key: 'mono29', tmdbIds: [2660], app: { name: 'MONOMAX', url: 'https://www.monomax.me/' }, platform: 'monomax' },
  { key: 'ais_play', tmdbIds: [3489], app: { name: 'AIS PLAY', url: 'https://aisplay.ais.th/' }, platform: 'ais_play' },
  { key: 'trueid', tmdbIds: [5319], app: { name: 'TrueID', url: 'https://www.trueid.net/' }, platform: 'trueid' },
  { key: 'viu', tmdbIds: [2980, 8922, 9261], app: { name: 'Viu', url: 'https://www.viu.com/ott/th' }, platform: 'viu' },
  { key: 'wetv', tmdbIds: [3732, 2007], app: { name: 'WeTV', url: 'https://wetv.vip/th' }, platform: 'wetv' },
  { key: 'iqiyi', tmdbIds: [1330, 6316], app: { name: 'iQIYI', url: 'https://www.iq.com/' }, platform: 'iqiyi' },
  { key: 'youku', tmdbIds: [1419], app: { name: 'Youku', url: 'https://youku.tv/' }, platform: 'youku' },
];

export function getNetwork(key: string): NetworkOption | undefined {
  return NETWORKS.find((n) => n.key === key);
}

export function networkForTmdbId(id: number): NetworkOption | undefined {
  return NETWORKS.find((n) => n.tmdbIds.includes(id));
}
