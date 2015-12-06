import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Provider, connect } from 'react-redux';
import { applyMiddleware, createStore } from 'redux';
import thunk from 'redux-thunk';
import {
  AWAIT_MARKER,
  createReducer,
  getInfo,
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
    const todos = api.get();
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
          save: api.save(getState().todos),
        },
      });
    }
  },
};
const initialState = { isAppSynced: false, todos: [] };
const reducer = (state = initialState, action = {}) => {
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
const wrappedReducer = createReducer(reducer);
const store = applyMiddleware(thunk, awaitMiddleware)(createStore)(wrappedReducer);

@connect(state => state)
class App extends Component {
  componentDidMount() {
    this.props.dispatch(actions.getTodos());
  }
  render() {
    const { dispatch, todos, isAppSynced } = this.props;
    const { statuses, errors } = getInfo(this.props);
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

ReactDOM.render(<Provider store={store}><App /></Provider>, document.getElementById('root'));
