/* eslint-disable react-x/no-array-index-key */
import Tabs from '@node-core/ui-components/Common/Tabs';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import styles from './index.module.css';
import withIsland from '../../islands/withIsland.jsx';

const OverloadTabs = ({ children }) => {
  const tabs = children.map((_, index) => ({
    key: `${index + 1}`,
    label: `Overload #${index + 1}`,
  }));

  return (
    <Tabs tabs={tabs} defaultValue="1">
      <div className={styles.panelContainer}>
        {children.map((child, index) => (
          <TabsPrimitive.Content
            key={`overload-panel-${index}`}
            value={`${index + 1}`}
            forceMount={true}
            className={styles.panel}
          >
            {child}
          </TabsPrimitive.Content>
        ))}
      </div>
    </Tabs>
  );
};

export default withIsland(OverloadTabs, {
  name: 'OverloadTabs',
  on: { interaction: 'pointerover,focusin,touchstart' },
});
