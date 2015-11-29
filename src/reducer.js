import { AWAIT_META_CONTAINER, AWAIT_INFO_CONTAINER } from './constants';
import { getPromiseKeys } from './utils';

export default reducer => (state, action) => {
  if (action.meta && action.meta[AWAIT_META_CONTAINER]) {
    const awaitMeta = action.meta[AWAIT_META_CONTAINER];
    const { status } = awaitMeta;

    if (typeof state !== 'object') {
      throw new Error('redux-await only works with states which are objects');
    }

    const info = {};
    awaitMeta.promiseKeys.forEach(prop => {
      info[prop] = { status };
      if (status === 'failure') {
        info[prop].error = action.payload;
      }
    });
    const nextState = { ...state, [AWAIT_INFO_CONTAINER]: info };

    return reducer(nextState, action, state);
  }

  return reducer(state, action);
};
