import { resolveProps, getNonPromiseProperties, getPromiseKeys, objectWithoutProperties } from './utils';

import { AWAIT_MARKER, AWAIT_META_CONTAINER } from './constants';

export const getPendingActionType = type => `${AWAIT_MARKER}/pending/${type}`;
export const getFailedActionType = type => `${AWAIT_MARKER}/fail/${type}`;

export const middleware = ({ dispatch }) => next => action => {
  const { payload, type, meta } = action;

  if (payload && action.AWAIT_MARKER === AWAIT_MARKER) {

    const promiseKeys = getPromiseKeys(payload);
    const scalarValues = getNonPromiseProperties(payload);
    const pendingMeta = { [AWAIT_META_CONTAINER]: { promiseKeys, scalarValues, status: 'pending' } };
    const successMeta = { [AWAIT_META_CONTAINER]: { promiseKeys, scalarValues, status: 'success' } };
    const failureMeta = { [AWAIT_META_CONTAINER]: { promiseKeys, scalarValues, status: 'failure' } };

    const newAction = objectWithoutProperties(action, ['type', 'payload', 'AWAIT_MARKER']);

    dispatch({
      ...newAction,
      type: getPendingActionType(type),
      meta: { ...meta, ...pendingMeta, type },
    });

    const successCallback = payload => {
      dispatch({
        ...newAction,
        type,
        payload,
        meta: { ...meta, ...successMeta },
      });
    };

    const failureCallback = error => {
      dispatch({
        ...newAction,
        type: getFailedActionType(type),
        payload: error,
        meta: { ...meta, ...failureMeta, type },
      });
    }

    resolveProps(payload).then(successCallback, failureCallback);

  } else {
    next(action);
  }
};
