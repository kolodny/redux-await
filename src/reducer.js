import { AWAIT_META_CONTAINER, AWAIT_INFO_CONTAINER } from './constants';
import { getPromiseKeys } from './utils';

const initialState = { statuses: {}, errors: {} };
export default (state = initialState, action = {}) => {
  if (action.meta && action.meta[AWAIT_META_CONTAINER]) {
    const awaitMeta = action.meta[AWAIT_META_CONTAINER];
    const { status } = awaitMeta;

    const statuses = { ...state.statuses };
    const errors = { ...state.errors };
    awaitMeta.promiseKeys.forEach(prop => {
      statuses[prop] = status;
      if (status === 'failure') {
        errors[prop] = action.payload;
      } else {
        // only unset errors prop if previously set
        if (errors[prop]) {
          errors[prop] = null;
        }
      }
    });
    return { statuses, errors };
  }
  return state;
};
