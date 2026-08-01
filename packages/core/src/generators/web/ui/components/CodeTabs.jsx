import CodeTabs from '@node-core/ui-components/MDX/CodeTabs';

import withIsland from '../islands/withIsland.jsx';

export default withIsland(CodeTabs, {
  name: 'CodeTabs',
  on: { interaction: 'pointerover,focusin,touchstart' },
});
