import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Provider, connect } from 'react-redux';
import { applyMiddleware, createStore } from 'redux';
import thunk from 'redux-thunk';

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

const GET_TODOS_PENDING = 'GET_TODOS_PENDING';
const GET_TODOS = 'GET_TODOS';
const GET_TODOS_ERROR = 'GET_TODOS_ERROR';
const ADD_TODO = 'ADD_TODO';
const SAVE_APP_PENDING = 'SAVE_APP_PENDING'
const SAVE_APP = 'SAVE_APP';
const SAVE_APP_ERROR = 'SAVE_APP_ERROR';
const actions = {
  getTodos() {
    return dispatch => {
      dispatch({ type: GET_TODOS_PENDING });
      api.get()
        .then(todos => dispatch({ type: GET_TODOS, payload: { todos } }))
        .catch(error => dispatch({ type: GET_TODOS_ERROR, payload: error, error: true }))
      ;
      ;
    }
  },
  addTodo(todo) {
    return { type: ADD_TODO, payload: { todo } };
  },
  saveApp() {
    return (dispatch, getState) => {
      dispatch({ type: SAVE_APP_PENDING });
      api.save(getState().todos)
        .then(() => dispatch({ type: SAVE_APP }))
        .catch(error => dispatch({ type: SAVE_APP_ERROR, payload: error, error: true }))
      ;
    }
  },
};
const initialState = {
  isAppSynced: false,
  isFetching: false,
  fetchingError: null,
  isSaving: false,
  savingError: null,
  todos: [],
};
const reducer = (state = initialState, action = {}) => {
  if (action.type === GET_TODOS_PENDING) {
    return { ...state, isFetching: true, fetchingError: null };
  }
  if (action.type === GET_TODOS) {
    return {
      ...state,
      isAppSynced: true,
      isFetching: false,
      fetchingError: null,
      todos: action.payload.todos,
    };
  }
  if (action.type === GET_TODOS_ERROR) {
    return { ...state, isFetching: false, fetchingError: action.payload.message };
  }
  if (action.type === ADD_TODO) {
    return { ...state, isAppSynced: false, todos: state.todos.concat(action.payload.todo) };
  }
  if (action.type === SAVE_APP_PENDING) {
    return { ...state, isSaving: true, savingError: null };
  }
  if (action.type === SAVE_APP) {
    return { ...state, isAppSynced: true, isSaving: false, savingError: null };
  }
  if (action === SAVE_APP_ERROR) {
    return { ...state, isSaving: false, savingError: action.payload.message }
  }
  return state;
};
const store = applyMiddleware(thunk)(createStore)(reducer);

@connect(state => state)
class App extends Component {
  componentDidMount() {
    this.props.dispatch(actions.getTodos());
  }
  render() {
    const { dispatch, todos, isAppSynced, isFetching, fetchingError, isSaving, savingError } = this.props;
    const { input } = this.refs;
    return <div>
      {isAppSynced && 'app is synced up'}
      {isFetching && 'getting todos'}
      {fetchingError && 'there was an error getting todos: ' + fetchingError}
      {isSaving && 'saving todos'}
      {savingError && 'there was an error saving todos: ' + savingError}
      <ul>{todos.map(todo => <li>{todo}</li>)}</ul>
      <input ref="input" type="text" onBlur={() => dispatch(actions.addTodo(input.value))} />
      <button onClick={() => dispatch(actions.saveApp())}>Sync</button>
      {JSON.stringify(store.getState())}
    </div>;
  }
}

ReactDOM.render(<Provider store={store}><App /></Provider>, document.getElementById('root'));
