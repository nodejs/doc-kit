import { project } from '#theme/config';

/**
 * Plain-text stand-in for `#theme/Logo`, used when a project has not
 * configured a logo component of its own.
 */
export default props => <span {...props}>{project}</span>;
