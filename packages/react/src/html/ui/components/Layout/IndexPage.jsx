import styles from './IndexPage.module.css';
import StabilityBadge from '../StabilityBadge';

import { project, version } from '#theme/config';

/**
 * Body of the synthetic `index.html` page
 */
export default ({ modules }) => (
  <>
    <p>
      The API reference documentation for {project} v{version.version}.
    </p>

    <ul className={styles.moduleIndex}>
      {modules.map(({ name, href, stability }) => (
        <li key={href}>
          <a href={href}>{name}</a>

          <StabilityBadge className={styles.badge} stability={stability} />
        </li>
      ))}
    </ul>
  </>
);
