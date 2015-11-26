import { AWAIT_META_CONTAINER, AWAIT_INFO_CONTAINER } from './constants';
import { getPromiseKeys, objectWithoutProperties } from './utils';

export default reducer => (state, action) => {
  let nextState;
  if (action.meta && action.meta[AWAIT_META_CONTAINER]) {
    const awaitMeta = action.meta[AWAIT_META_CONTAINER];

    if (awaitMeta.status === 'pending') {
      const pendingProperties = {};
      awaitMeta.promiseKeys.forEach(prop => pendingProperties[prop] = {
        [AWAIT_INFO_CONTAINER]: { status: 'pending', error: null }
      });
      nextState = { ...state, ...pendingProperties };

    } else if (awaitMeta.status === 'success') {
      nextState = objectWithoutProperties(state, awaitMeta.promiseKeys);

    } else if (awaitMeta.status === 'failure') {
      const errorProperties = {};
      awaitMeta.promiseKeys.forEach(prop => errorProperties[prop] = {
        [AWAIT_INFO_CONTAINER]: { status: 'failure', error: action.payload }
      });
      nextState = { ...state, ...errorProperties };
    }

  } else {
    nextState = state
  }
  return reducer(nextState, action, state);
};
