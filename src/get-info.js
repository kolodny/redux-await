import { AWAIT_INFO_CONTAINER } from './constants';

export default props => {
  const container = props && props[AWAIT_INFO_CONTAINER];

  /* istanbul ignore if */
  if (!container) {
    throw new Error("coudn't find any info");
  }

  return prop => container[prop] || {};
}
