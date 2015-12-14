import expect from 'expect';
import {
  AWAIT_MARKER,
  AWAIT_META_CONTAINER,
  middleware,
  reducer,
  connect,
  getPendingActionType,
} from '../src';

describe('redux-await', () => {
  it('exports AWAIT_MARKER', () => {
    expect(AWAIT_MARKER).toBeTruthy();
  });
  it('exports AWAIT_META_CONTAINER', () => {
    expect(AWAIT_META_CONTAINER).toBeTruthy();
  });
  it('exports middleware', () => {
    expect(middleware).toBeTruthy();
  });
  it('exports reducer', () => {
    expect(reducer).toBeTruthy();
  });
  it('exports connect', () => {
    expect(connect).toBeTruthy();
  });

  describe('reducer', () => {
    it('handles initial actions', () => {
      expect( reducer(undefined, {}) ).toEqual({ statuses: {}, errors: {} });
    });
    it('handles AWAIT_META_CONTAINER pending actions', () => {
      const action = {
        meta: {
          [AWAIT_META_CONTAINER]: {
            status: 'pending',
            promiseKeys: ['a'],
          }
        }
      };
      expect( reducer({ statuses: {}, errors: {} }, action )).toEqual(
        { statuses: { a: 'pending' }, errors: {} }
      );
    });

    it('handles AWAIT_META_CONTAINER success actions', () => {
      const action = {
        meta: {
          [AWAIT_META_CONTAINER]: {
            status: 'success',
            promiseKeys: ['a'],
          }
        }
      };
      expect( reducer({ statuses: { a: 'pending' }, errors: {} }, action )).toEqual(
        { statuses: { a: 'success' }, errors: {} }
      );
    });


    it('handles AWAIT_META_CONTAINER failure actions', () => {
      const action = {
        payload: new Error('fail!'),
        meta: {
          [AWAIT_META_CONTAINER]: {
            status: 'failure',
            promiseKeys: ['a'],
          }
        }
      };
      expect( reducer({ statuses: { a: 'pending' }, errors: {} }, action )).toEqual(
        { statuses: { a: 'failure' }, errors: { a: new Error('fail!') } }
      );
    });


  });


});
