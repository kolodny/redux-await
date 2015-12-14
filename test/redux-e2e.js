import expect from 'expect';
import { createStore, applyMiddleware, combineReducers } from 'redux';
import {
  AWAIT_MARKER,
  middleware,
  reducer as awaitReducer,
  getPendingActionType,
} from '../src';

describe('redux-await', () => {

  it("works with redux", done => {
    const actions = [];
    const createStoreWithMiddleware = applyMiddleware(middleware)(createStore);
    const appReducer = (state = {}, action) => {
      actions.push(action);
      if (action.type === getPendingActionType('TESTING')) { return { ...state, wasPending: true } };
      if (action.type === 'TESTING') { return { ...state, wasTested: true, soon: action.payload.soon + '!' } }
      return state;
    };
    const reducers = combineReducers({
      app: appReducer,
      await: awaitReducer,
    })

    const store = createStoreWithMiddleware(reducers);
    const states = [];
    store.subscribe(() => {
      states.push(store.getState());
      if (states.length === 6) {
        try {
          expect(states[0].app).toEqual({wasPending: true});
          expect(states[0].await.statuses.soon).toEqual('pending');
          expect(states[0].await.statuses.heyo).toEqual('pending');

          // doesn't overwrite old statuses
          expect(states[1].await.statuses.heyo).toEqual('pending');

          expect(states[2].app).toEqual({ wasPending: true, wasTested: true, soon: 'v!' });
          expect(states[2].await.statuses.soon).toEqual('success');
          expect(states[2].await.statuses.heyo).toEqual('success');

          expect(states[3].await.statuses.soon).toEqual('failure');
          expect(states[3].await.errors.soon.message).toEqual('no!');

          expect(states[4].await.statuses.soon).toEqual('pending');
          expect(states[4].await.errors.soon).toBeFalsy();

          expect(states[5].await.statuses.soon).toEqual('success');

          // make sure we don't overwrite action.meta
          expect(actions[actions.length - 1].meta.so).toEqual('meta');
          done();
        } catch (e) {
          done(e);
        }
      }
    });
    const generateRejection = () => new Promise((_, reject) => setTimeout(() => reject(new Error('no!')), 15));

                                                                              // smiley face;
    store.dispatch({ type: 'TESTING', AWAIT_MARKER, payload: { soon: Promise.resolve('v'), heyo: Promise.resolve('heyo'), ignore: 123 } });
    store.dispatch({ type: 'TESTING', AWAIT_MARKER, payload: { soon: generateRejection(), ignore: 123 } });
    setTimeout(() => store.dispatch({ type: 'TESTING', AWAIT_MARKER, meta: {so: 'meta'}, payload: { soon: Promise.resolve('v'), heyo: Promise.resolve('heyo'), ignore: 123 } }), 20)

  });

});
