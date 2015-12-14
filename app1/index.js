import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Provider, connect } from 'react-redux';
import { applyMiddleware, createStore, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import createLogger from 'redux-logger';

const GET_TODOS = 'GET_TODOS';
const ADD_TODO = 'ADD_TODO';
const SAVE_APP = 'SAVE_APP';
const actions = {
  getTodos() {
    const todos = JSON.parse(localStorage.todos || '[]');
    return { type: GET_TODOS, payload: { todos } };
  },
  addTodo(todo) {
    return { type: ADD_TODO, payload: { todo } };
  },
  saveApp() {
    return (dispatch, getState) => {
      localStorage.todos = JSON.stringify(getState().todos.todos);
      dispatch({ type: SAVE_APP });
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
})
const store = applyMiddleware(thunk, createLogger())(createStore)(reducer);

class App extends Component {
  componentDidMount() {
    this.props.dispatch(actions.getTodos());
  }
  render() {
    const { dispatch, todos, isAppSynced } = this.props;
    const { input } = this.refs;
    return <div>
      {isAppSynced && 'app is synced up'}
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
