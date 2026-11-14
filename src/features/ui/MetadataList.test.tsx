import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MetadataList } from './MetadataList';

const Row = ({ value }: { value: string }) => (value ? <p>{value}</p> : null);
const TextRow = ({ text }: { text: string }) => (text ? <p>{text}</p> : null);

describe('MetadataList', () => {
  it('omits empty rows and empty conditional strings', () => {
    const view = render(
      <MetadataList>
        {''}
        {false}
        <Row value="" />
        <TextRow text="" />
      </MetadataList>,
    );
    expect(view.container).toBeEmptyDOMElement();
  });
  it('keeps populated rows, plain text and other content', () => {
    const view = render(
      <MetadataList>
        <Row value="Size" />
        <TextRow text="Common" />
        Text<span>Other</span>
      </MetadataList>,
    );
    expect(view.container.querySelector('.metadata-list')).toHaveTextContent(
      'SizeCommonTextOther',
    );
  });
});
