import { CAMPAIGN_MAPS } from '@/features/campaign-map/maps';
import type { WikiCampaign } from './types';

export interface WikiCampaignView extends WikiCampaign {
  titleKey?: string;
}

export function mergeCampaigns(campaigns: WikiCampaign[]): WikiCampaignView[] {
  const views: WikiCampaignView[] = campaigns.map((campaign) => ({ ...campaign }));
  for (const map of CAMPAIGN_MAPS) {
    if (views.some((campaign) => campaign.id === map.campaignId)) continue;
    views.push({
      id: map.campaignId,
      title: '',
      pages: [],
      titleKey: 'wiki.campaigns.tombOfAnnihilation',
    });
  }
  return views;
}

export function campaignTitle(
  campaign: WikiCampaignView,
  translate: (key: string) => string,
): string {
  return (
    campaign.title || (campaign.titleKey ? translate(campaign.titleKey) : campaign.id)
  );
}
