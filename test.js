import expect from 'expect';
import { createStore, applyMiddleware } from 'redux';
import {
  AWAIT_MARKER,
  AWAIT_META_CONTAINER,
  AWAIT_INFO_CONTAINER,
  middleware,
  createReducer,
  getInfo,
  getPendingActionType,
} from './src';

describe('redux-await', () => {
  it('exports AWAIT_MARKER', () => {
    expect(AWAIT_MARKER).toBeTruthy();
  });
  it('exports AWAIT_META_CONTAINER', () => {
    expect(AWAIT_META_CONTAINER).toBeTruthy();
  });
  it('exports AWAIT_INFO_CONTAINER', () => {
    expect(AWAIT_INFO_CONTAINER).toBeTruthy();
  });
  it('exports middleware', () => {
    expect(middleware).toBeTruthy();
  });
  it('exports createReducer', () => {
    expect(createReducer).toBeTruthy();
  });
  it('exports getInfo', () => {
    expect(getInfo).toBeTruthy();
  });

  describe('createReducer', () => {
    describe('wraps a reducer', () => {
      let reducer;
      let wrappedReducer;
      beforeEach(() => {
        reducer = (state = {}, action) => {
          if (action.type === 'TESTING') { return { ...state, wasTested: true } }
          return state;
        };
        wrappedReducer = createReducer(reducer);
      });

      it('still runs on actions it was reducing', () => {
        const initalState = wrappedReducer(undefined, { type: 'FOOBAR' });
        expect(initalState).toEqual({});
        const nextState = wrappedReducer({}, { type: 'TESTING' });
        expect(nextState).toEqual({ wasTested: true });
      });

      it('handles events with action.meta[AWAIT_META_CONTAINER]', () => {
        const nextState = wrappedReducer({a: true, b: true}, {
          type: 'TESTING',
          meta: {
            [AWAIT_META_CONTAINER]: {
              promiseKeys: ['a'],
              status: 'success',
            },
          },
        });
        expect(nextState.b).toBeTruthy();
        expect(nextState.wasTested).toBeTruthy();
      });

    });
  });

  it("does it's thing", done => {
    let lastAction;
    const createStoreWithMiddleware = applyMiddleware(middleware)(createStore);
    const reducer = (state = {}, action) => {
      lastAction = action;
      if (action.type === getPendingActionType('TESTING')) { return { ...state, wasPending: true } };
      if (action.type === 'TESTING') { return { ...state, wasTested: true, soon: action.payload.soon + '!' } }
      return state;
    };
    const store = createStoreWithMiddleware(  createReducer(reducer)  );
    const states = [];
    store.subscribe(() => {
      states.push(store.getState());
      if (states.length === 6) {
        try {
          expect(getInfo(states[0]).statuses.soon).toEqual('pending');
          expect(states[0].wasPending).toEqual(true);
          expect(getInfo(states[1]).statuses.soon).toEqual('pending');
          expect(getInfo(states[2]).statuses.soon).toEqual('success');
          expect(states[2].soon).toEqual('v!');
          expect(states[2].wasTested).toEqual(true);
          expect(getInfo(states[3]).statuses.soon).toEqual('failure');
          expect(getInfo(states[3]).errors.soon.message).toEqual('no!');
          expect(getInfo(states[4]).statuses.soon).toEqual('pending');
          expect(getInfo(states[5]).statuses.soon).toEqual('success');
          expect(getInfo(states[4]).errors.soon).toBeFalsy();
          expect(getInfo(states[5]).errors.soon).toBeFalsy();

          // make sure we don't overwrite action.meta
          expect(lastAction.meta.so).toEqual('meta');
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
