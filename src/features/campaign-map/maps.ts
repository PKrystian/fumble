export interface CampaignMapConfig {
  id: string;
  campaignId: string;
  campaignTitle: string;
  imagePath: string;
  columns: number;
  rows: number;
  revealedRanges: readonly string[];
}

export const CAMPAIGN_MAPS: readonly CampaignMapConfig[] = [
  {
    id: 'chult',
    campaignId: 'grobowiec-zaglady',
    campaignTitle: 'Tomb of Annihilation',
    imagePath: 'campaign-maps/chultmap.jpg',
    columns: 72,
    rows: 85,
    revealedRanges: [
      '0-1545',
      '1547-1616',
      '1620-1685',
      '1689',
      '1692-1755',
      '1764-1825',
      '1830',
      '1834-1895',
      '1900-1902',
      '1904-1966',
      '1971',
      '1974-1979',
      '1981-1985',
      '1988-2035',
      '2037',
      '2043',
      '2046-2051',
      '2055-2057',
      '2060-2106',
      '2115',
      '2117-2123',
      '2127-2128',
      '2132-2180',
      '2186-2187',
      '2189-2191',
      '2193',
      '2199-2200',
      '2204-2264',
      '2271-2272',
      '2276-2278',
      '2281-2327',
      '2329-2337',
      '2348-2350',
      '2354-2392',
      '2401-2409',
      '2420-2422',
      '2426-2466',
      '2472-2483',
      '2490-2494',
      '2497-2537',
      '2544-2553',
      '2555',
      '2562-2565',
      '2569-2607',
      '2616-2624',
      '2628-2629',
      '2634-2636',
      '2638',
      '2642-2680',
      '2686-2688',
      '2691-2700',
      '2707-2712',
      '2715-2752',
      '2754-2760',
      '2763-2772',
      '2781',
      '2783',
      '2787-2824',
      '2826-2831',
      '2834-2844',
      '2858-2897',
      '2901-2902',
      '2904-2916',
      '2930-2972',
      '2975-2987',
      '3002-3045',
      '3049-3058',
      '3074-3115',
      '3120-3123',
      '3125-3127',
      '3129',
      '3146-3151',
      '3153-3185',
      '3192-3193',
      '3199',
      '3219-3221',
      '3227-3256',
      '3301-3328',
      '3373-3400',
      '3436-3437',
      '3447-3474',
      '3478-3480',
      '3508-3509',
      '3512',
      '3516',
      '3519-3552',
      '3579-3584',
      '3588-3590',
      '3593-3623',
      '3638',
      '3650-3693',
      '3703-3704',
      '3708-3710',
      '3714',
      '3721-3768',
      '3775-3787',
      '3795',
      '3799-3807',
      '3809',
      '3813-3840',
      '3847-3860',
      '3872-3873',
      '3877-3879',
      '3885-3912',
      '3919-3934',
      '3945',
      '3951',
      '3957-3980',
      '3993-4005',
      '4029-4052',
      '4069-4071',
      '4101-4126',
      '4136',
      '4141-4143',
      '4173-4199',
      '4205-4212',
      '4240-4242',
      '4245-4270',
      '4274-4286',
      '4296',
      '4308',
      '4310-4314',
      '4316-4342',
      '4344-4361',
      '4363-4364',
      '4366-4368',
      '4374',
      '4381-4385',
      '4388-4440',
      '4446-4447',
      '4453-4456',
      '4459-4519',
      '4526-4528',
      '4530-4591',
      '4597-4664',
      '4670-4736',
      '4740-4808',
      '4810-6119',
    ],
  },
];

export function getCampaignMap(campaignId: string): CampaignMapConfig | null {
  return CAMPAIGN_MAPS.find((map) => map.campaignId === campaignId) ?? null;
}

export function expandRevealedRanges(
  ranges: readonly string[],
  totalHexes: number,
): ReadonlySet<number> {
  const revealed = new Set<number>();
  if (totalHexes <= 0) return revealed;

  const add = (value: number) => {
    if (Number.isInteger(value) && value >= 0 && value < totalHexes) {
      revealed.add(value);
    }
  };

  for (const range of ranges) {
    if (!/^\d+(?:-\d+)?$/.test(range.trim())) continue;
    const parts = range.split('-').map((part) => Number(part.trim()));
    if (parts.length === 1) {
      add(parts[0]!);
      continue;
    }
    const start = Math.max(0, Math.min(parts[0]!, parts[1]!));
    const end = Math.min(totalHexes - 1, Math.max(parts[0]!, parts[1]!));
    for (let index = start; index <= end; index += 1) add(index);
  }

  return revealed;
}

export function compressRevealedRanges(revealed: ReadonlySet<number>): string[] {
  const indices = [...revealed].sort((left, right) => left - right);
  if (indices.length === 0) return [];

  const ranges: string[] = [];
  let start = indices[0]!;
  let end = start;
  for (const index of indices.slice(1)) {
    if (index === end + 1) {
      end = index;
      continue;
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
    start = index;
    end = index;
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges;
}

export function getHexGridPath(
  columns: number,
  rows: number,
  revealed: ReadonlySet<number>,
): string {
  if (columns <= 0 || rows <= 0 || revealed.size === 0) return '';

  const columnUnit = 100 / (columns * 3 + 1);
  const rowUnit = 100 / (rows * 2 + 1);
  const cellWidth = columnUnit * 4;
  const cellHeight = rowUnit * 2;
  const horizontalStep = columnUnit * 3;
  const path: string[] = [];

  for (const index of revealed) {
    if (!Number.isInteger(index) || index < 0 || index >= columns * rows) continue;
    const column = index % columns;
    const row = Math.floor(index / columns);
    const left = column * horizontalStep;
    const top = row * cellHeight + (column % 2 === 0 ? rowUnit : 0);
    const points = [
      [left + cellWidth * 0.25, top],
      [left + cellWidth * 0.75, top],
      [left + cellWidth, top + cellHeight * 0.5],
      [left + cellWidth * 0.75, top + cellHeight],
      [left + cellWidth * 0.25, top + cellHeight],
      [left, top + cellHeight * 0.5],
    ];
    path.push(`M ${points.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`);
  }

  return path.join(' ');
}

export function parseMapEditorCells(
  raw: string | null,
  totalHexes: number,
): ReadonlySet<number> | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return new Set(
      parsed.filter(
        (value): value is number =>
          typeof value === 'number' &&
          Number.isInteger(value) &&
          value >= 0 &&
          value < totalHexes,
      ),
    );
  } catch {
    return null;
  }
}

export function getMapEditorStorageKey(campaignId: string): string {
  return `fumble-campaign-map-editor:${campaignId}`;
}
