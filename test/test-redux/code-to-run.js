import jsdom from 'jsdom';
global.document = jsdom.jsdom('<!doctype html><html><body><div id="root"></div></body></html>');
global.window = document.defaultView;
global.navigator = {
  userAgent: 'node.js'
};

import expect from 'expect';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { applyMiddleware, createStore, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import {
  AWAIT_MARKER,
  AWAIT_META_CONTAINER,
  createReducer,
  getPendingActionType,
  getFailedActionType,
  connect,
  reducer as awaitReducer,
  middleware as awaitMiddleware,
} from 'redux-await';

describe('redux-await', () => {
  it('passes an intense react-redux e2e test suite ;)', done => {

    const savedActions = [], savedStates = [], savedProps = [];

    const counter = (state = 0, action = {}) => {
      savedActions.push(action);
      if (action.type === 'INC') return state + 1;
      return state;
    };
    const reducer = combineReducers({
      counter,
      await: awaitReducer,
    });
    const store = applyMiddleware(awaitMiddleware)(createStore)(reducer);
    store.subscribe(() => {
      savedStates.push(store.getState());
      if (savedActions.length > 7) {
        setTimeout(() => {
          checkThatEverythingWentOk({ savedActions, savedStates, savedProps }, done);
        }, 100)
      }
    });

    class App extends Component {
      render() {
        savedProps.push(this.props)
        return null;
      }
    }
    const ConnectedApp = connect(state => ({ counter: state.counter }) )(App);

    ReactDOM.render(React.createElement(Provider, { store }, React.createElement(ConnectedApp)), document.getElementById('root'));
    store.dispatch({ type: 'IGNORE_ME', AWAIT_MARKER, payload: { soon: Promise.resolve('v'), heyo: Promise.resolve('heyo'), ignore: 123 } });
    store.dispatch({ type: 'IGNORE_ME', AWAIT_MARKER, payload: { soon: new Promise((_, rej) => setTimeout(() => rej(new Error('no!')), 100)) } });
    store.dispatch({ type: 'INC' });

  });
});


function checkThatEverythingWentOk({ savedActions, savedStates, savedProps }, done) {
  try {
    const dispatch = savedProps[0].dispatch;
    savedActions.shift();
    savedActions.shift();
    savedActions.shift();

    expect(savedActions[0].type).toEqual(getPendingActionType('IGNORE_ME'));
    expect(savedActions[0].meta[AWAIT_META_CONTAINER].promiseKeys).toEqual(['soon', 'heyo']);
    expect(savedActions[0].meta[AWAIT_META_CONTAINER].scalarValues).toEqual({ignore: 123});

    expect(savedActions[1].type).toEqual(getPendingActionType('IGNORE_ME'));
    expect(savedActions[1].meta[AWAIT_META_CONTAINER].promiseKeys).toEqual(['soon']);
    expect(savedActions[1].meta[AWAIT_META_CONTAINER].scalarValues).toEqual({});

    expect(savedActions[2].type).toEqual('INC');

    expect(savedActions[3].type).toEqual('IGNORE_ME');
    expect(savedActions[3].payload).toEqual({ soon: "v", heyo: "heyo", ignore: 123 });

    expect(savedActions[4].type).toEqual(getFailedActionType('IGNORE_ME'));
    expect(savedActions[4].payload).toBeAn(Error);

    expect(savedStates[0]).toEqual({counter: 0, await: { errors: {}, statuses: {
      soon: 'pending', heyo: 'pending'
    }}});

    expect(savedStates[1]).toEqual(savedStates[0]);
    expect(savedStates[2]).toEqual({ ...savedStates[0], counter: 1 });

    expect(savedStates[3]).toEqual({counter: 1, await: { errors: {}, statuses: {
      soon: 'success', heyo: 'success'
    }}});

    expect(savedStates[4]).toEqual({counter: 1, await: { errors: { soon: new Error() }, statuses: {
      soon: 'failure', heyo: 'success'
    }}});

    expect(savedProps[0]).toEqual({ dispatch, counter: 0, statuses: {}, errors: {} });
    expect(savedProps[1]).toEqual({ dispatch, counter: 0, statuses: { soon: 'pending', heyo: 'pending' }, errors: {} });
    expect(savedProps[2]).toEqual({ dispatch, counter: 0, statuses: { soon: 'pending', heyo: 'pending' }, errors: {} });
    expect(savedProps[3]).toEqual({ dispatch, counter: 1, statuses: { soon: 'pending', heyo: 'pending' }, errors: {} });
    expect(savedProps[4]).toEqual({ dispatch, counter: 1, statuses: { soon: 'success', heyo: 'success' }, errors: {} });
    expect(savedProps[5]).toEqual({ dispatch, counter: 1, statuses: { soon: 'failure', heyo: 'success' }, errors: {
      soon: new Error()
    } });

    done();
  } catch (e) { done(e) }
}
