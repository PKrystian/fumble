export interface WikiPage {
  slug: string;
  title: string;
  category: string;
  html: string;
}

export interface WikiData {
  meta: {
    pageCount: number;
    generatedAt: string;
    source: string;
  };
  pages: WikiPage[];
}
