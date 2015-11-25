import { AWAIT_INFO_CONTAINER } from './constants';

export default object => {
  if (!object || !object[AWAIT_INFO_CONTAINER]) {
    return { status: 'success', value: object };
  }

  return object[AWAIT_INFO_CONTAINER];
}
