import { useContext } from 'react';
import { DetailPresentation } from './detailPresentationContext';

export function DetailArtwork() {
  return useContext(DetailPresentation).artwork;
}

export function DetailBadges() {
  return useContext(DetailPresentation).badge;
}
