import { AWAIT_INFO_CONTAINER } from './constants';

export default props => {
  const container = (props && props[AWAIT_INFO_CONTAINER]) || {};

  return prop => container[prop] || {};
}
