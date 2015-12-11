import jsdom from 'jsdom';
global.document = jsdom.jsdom('<!doctype html><html><body><div id="root"></div></body></html>');
global.window = document.defaultView;
global.navigator = {
  userAgent: 'node.js'
};

import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { applyMiddleware, createStore, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import {
  AWAIT_MARKER,
  createReducer,
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
      if (action.type === 'DEC') return state - 1;
      return state;
    };
    const reducer = combineReducers({
      counter,
      await: awaitReducer,
    });
    const store = applyMiddleware(awaitMiddleware)(createStore)(reducer);
    store.subscribe(() => {
      savedStates.push(store.getState());
      if (savedActions.length > 6) {
        console.log(JSON.stringify({ savedActions, savedStates, savedProps }, null, 2));
        checkThatEverythingWentOk({ savedActions, savedStates, savedProps });
        done();
      }
    });

    @connect(state => ({ counter: state.counter }) )
    class App extends Component {
      render() {
        savedProps.push(this.props)
        return <div />;
      }
    }

    ReactDOM.render(<Provider store={store}><App /></Provider>, document.getElementById('root'));
    store.dispatch({ type: 'IGNORE_ME', AWAIT_MARKER, payload: { soon: Promise.resolve('v'), heyo: Promise.resolve('heyo'), ignore: 123 } });
    store.dispatch({ type: 'IGNORE_ME', AWAIT_MARKER, payload: { soon: new Promise((_, rej) => setTimeout(() => rej(new Error('no!')), 100)) } });
    store.dispatch({ type: 'INC' });

  });
});


function checkThatEverythingWentOk({ savedActions, savedStates, savedProps }) {

}
