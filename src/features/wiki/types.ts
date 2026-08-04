export interface WikiPage {
  campaignId: string;
  slug: string;
  title: string;
  category: string;
  html: string;
}

export interface WikiCampaign {
  id: string;
  title: string;
  pages: WikiPage[];
}

export interface WikiData {
  meta: {
    pageCount: number;
    generatedAt: string;
    source: string;
  };
  campaigns: WikiCampaign[];
}
