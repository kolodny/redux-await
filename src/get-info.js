import { AWAIT_INFO_CONTAINER } from './constants';

export default props => {
  return (props && props[AWAIT_INFO_CONTAINER]) || { statuses: {}, errors: {} };
}
