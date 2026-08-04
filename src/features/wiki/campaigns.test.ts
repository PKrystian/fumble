import { describe, expect, it } from 'vitest';
import { campaignTitle, mergeCampaigns } from './campaigns';

describe('wiki campaigns', () => {
  it('keeps imported campaigns and adds the configured map campaign', () => {
    const campaigns = mergeCampaigns([
      { id: 'glod-smoka', title: 'Głód Smoka', pages: [] },
    ]);
    expect(campaigns.map((campaign) => campaign.id)).toEqual([
      'glod-smoka',
      'grobowiec-zaglady',
    ]);
    expect(campaigns[1]).toMatchObject({
      title: '',
      titleKey: 'wiki.campaigns.tombOfAnnihilation',
    });
  });

  it('does not duplicate a campaign supplied by the vault', () => {
    const campaigns = mergeCampaigns([
      { id: 'grobowiec-zaglady', title: 'Grobowiec Zagłady', pages: [] },
    ]);
    expect(campaigns).toHaveLength(1);
  });

  it('resolves translated and fallback campaign titles', () => {
    const translated = mergeCampaigns([])[0]!;
    expect(campaignTitle(translated, (key) => `translated:${key}`)).toBe(
      'translated:wiki.campaigns.tombOfAnnihilation',
    );
    expect(campaignTitle({ id: 'custom', title: '', pages: [] }, () => '')).toBe(
      'custom',
    );
    expect(campaignTitle({ id: 'custom', title: 'Custom', pages: [] }, () => '')).toBe(
      'Custom',
    );
  });
});
