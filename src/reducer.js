import { AWAIT_META_CONTAINER, AWAIT_INFO_CONTAINER } from './constants';
import { getPromiseKeys } from './utils';

export default reducer => (state, action) => {
  if (action.meta && action.meta[AWAIT_META_CONTAINER]) {
    const awaitMeta = action.meta[AWAIT_META_CONTAINER];
    const { status } = awaitMeta;

    /* istanbul ignore if */
    if (typeof state !== 'object') {
      throw new Error('redux-await only works with states which are objects');
    }

    const info = state[AWAIT_INFO_CONTAINER] || {};
    const statuses = { ...info.statuses };
    const errors = { ...info.errors };
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
    const nextState = { ...state, [AWAIT_INFO_CONTAINER]: { statuses, errors } };

    return reducer(nextState, action, state);
  }

  return reducer(state, action);
};
