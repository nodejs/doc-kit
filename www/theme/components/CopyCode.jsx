import withIsland from '@doc-kit/generator-react/html/ui/islands/withIsland.jsx';

import CopyButton from './CopyButton.jsx';

/**
 * A code block with a copy button. The block is its child, highlighted on the
 * server and adopted as it is, so only the button hydrates.
 *
 * @param {{ text: string, label?: string, children: import('preact').ComponentChildren }} props
 */
const CopyCode = ({ text, label, children }) => (
  <div class="dk-copy-code">
    {children}
    <CopyButton text={text} label={label} />
  </div>
);

export default withIsland(CopyCode, {
  name: 'CopyCode',
  on: { idle: true },
});
