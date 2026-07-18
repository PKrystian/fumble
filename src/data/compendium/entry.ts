export type Entry = string | EntryNode;

export interface EntryNode {
  type: string;
  name?: string;
  entries?: Entry[];
  entry?: Entry;
  items?: Entry[];

  caption?: string;
  colLabels?: string[];

  rows?: (Entry[] | EntryNode)[];

  [key: string]: unknown;
}
