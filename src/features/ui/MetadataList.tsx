import { Children, isValidElement, type ReactNode } from 'react';

export function MetadataList({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter((child) => {
    if (!isValidElement<{ value?: ReactNode; text?: string }>(child))
      return Boolean(child);
    if ('value' in child.props) return Boolean(child.props.value);
    if ('text' in child.props) return Boolean(child.props.text);
    return true;
  });
  return rows.length > 0 ? <div className="metadata-list">{rows}</div> : null;
}
