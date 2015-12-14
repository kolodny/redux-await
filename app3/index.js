import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { applyMiddleware, createStore, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import createLogger from 'redux-logger';
import {
  AWAIT_MARKER,
  createReducer,
  connect,
  reducer as awaitReducer,
  middleware as awaitMiddleware,
} from 'redux-await';

// this not an API, this is a tribute
const api = {
  save(data) {
    return new Promise(resolve => {
      setTimeout(() => {
        localStorage.todos = JSON.stringify(data);
        resolve(true);
      }, 2000);
    });
  },
  get() {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(JSON.parse(localStorage.todos || '[]'));
      }, 1000);
    });
  }
}

const GET_TODOS = 'GET_TODOS';
const ADD_TODO = 'ADD_TODO';
const SAVE_APP = 'SAVE_APP';
const actions = {
  getTodos() {
    return {
      type: GET_TODOS,
      AWAIT_MARKER,
      payload: {
        todos: api.get(),
      },
    };
  },
  addTodo(todo) {
    return { type: ADD_TODO, payload: { todo } };
  },
  saveApp() {
    return (dispatch, getState) => {
      dispatch({
        type: SAVE_APP,
        AWAIT_MARKER,
        payload: {
          save: api.save(getState().todos.todos),
        },
      });
    }
  },
};
const initialState = { isAppSynced: false, todos: [] };
const todosReducer = (state = initialState, action = {}) => {
  if (action.type === GET_TODOS) {
    return { ...state, isAppSynced: true, todos: action.payload.todos };
  }
  if (action.type === ADD_TODO) {
    return { ...state, isAppSynced: false, todos: state.todos.concat(action.payload.todo) };
  }
  if (action.type === SAVE_APP) {
    return { ...state, isAppSynced: true };
  }
  return state;
};
const reducer = combineReducers({
  todos: todosReducer,
  await: awaitReducer,
})

const store = applyMiddleware(thunk, awaitMiddleware, createLogger())(createStore)(reducer);

class App extends Component {
  componentDidMount() {
    this.props.dispatch(actions.getTodos());
  }
  render() {
    const { dispatch, todos, isAppSynced, statuses, errors } = this.props;
    const { input } = this.refs;
    return <div>
      {isAppSynced && 'app is synced up'}
      {statuses.todos === 'pending' && 'getting todos'}
      {statuses.todos === 'failure' && 'there was an error getting todos: ' + errors.todos.message}
      {statuses.save === 'pending' && 'saving todos'}
      {errors.save && 'there was an error saving todos: ' + errors.save.message}
      <ul>{todos.map(todo => <li>{todo}</li>)}</ul>
      <input ref="input" type="text" onBlur={() => dispatch(actions.addTodo(input.value))} />
      <button onClick={() => dispatch(actions.saveApp())}>Sync</button>
      <br />
      <pre>{JSON.stringify(store.getState(), null, 2)}</pre>
    </div>;
  }
}


const ConnectedApp = connect(state => state.todos)(App);

ReactDOM.render(<Provider store={store}><ConnectedApp /></Provider>, document.getElementById('root'));
