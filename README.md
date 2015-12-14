redux-await
=============

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Downloads][downloads-image]][downloads-url]

Manage async redux actions sanely

# Breaking Changes!!
`redux-await` now takes control of a branch of your state/reducer tree similar to `redux-form`, and also like `redux-form` you need to use this module's version of `connect` and not `react-redux`'s


## Install

```js
npm install --save redux-await
```

## Usage

This module exposes a middleware, reducer, and connector to take care of async state in a redux
app. You'll need to:

1. Apply the middleware:

    ```js
    import { middleware as awaitMiddleware } from 'redux-await';
    let createStoreWithMiddleware = applyMiddleware(
      awaitMiddleware
    )(createStore);
    ```

2. Install the reducer into the `await` path of your `combineReducers`

    ```js
    import reducers from './reducers';

    // old code
    // const store = applyMiddleware(thunk)(createStore)(reducers);

    // new code
    import { reducer as awaitReducer } from 'redux-await';
    const store = applyMiddleware(thunk, awaitMiddleware)(createStore)({
      ...reducers,
      await: awaitReducer,
    });
    ```

3. Use the `connect` function from this module and not `react-redux`'s

    ```js
    // old code
    // import { connect } from 'react-redux';

    // new code
    import { connect } from 'redux-await';

    class FooPage extends Component {
      render() { /* ... */ }
    }

    export default connect(state => state.foo)(FooPage)

    ```


Now your action payloads can contain promises, you just need to add `AWAIT_MARKER` to the
action like this:

```js
// old code
//export const getTodos = () => ({
//  type: GET_TODOS,
//  payload: {
//    loadedTodos: localStorage.todos,
//  },
//});
//export const addTodo = todo => ({
//  type: ADD_TODO,
//  payload: {
//    savedTodo: todo,
//  },
//});

// new code
import { AWAIT_MARKER } from 'redux-await';
export const getTodos = () => ({
  type: GET_TODOS,
  AWAIT_MARKER,
  payload: {
    loadedTodos: api.getTodos(), // returns promise
  },
});
export const addTodo = todo => ({
  type: ADD_TODO,
  AWAIT_MARKER,
  payload: {
    savedTodo: api.saveTodo(todo), // returns promise
  },
});
```

Now your containers barely need to change:

```js
class Container extends Component {
  render() {
    const { todos, statuses, errors } = this.props;

    // old code
    //return <div>
    //  <MyList data={todos} />
    //</div>;

    // new code
    return <div>
      { statuses.loadedTodos === 'pending' && <div>Loading...</div> }
      { statuses.loadedTodos === 'success' && <MyList data={loadedTodos} /> }
      { statuses.loadedTodos.status === 'failure' && <div>Oops: {errors.loadedTodos.message}</div> }
      { statuses.savedTodo === 'pending' && <div>Saving new savedTodo</div> }
      { statuses.savedTodo === 'failure' && <div>There was an error saving</div> }
    </div>;
  }
}

//old code
// import { connect } from 'react-redux';

// new code
import { connect } from 'redux-await'; // it just spreads state.await on props

export default connect(state => state.todos)(Container)
```

# Why

Redux is mostly concerned about how to manage state in a synchronous setting. Async apps create
challenges like keeping track of the async status and dealing with async errors.
While it is possible to build an app this way using
[redux-thunk](https://github.com/gaearon/redux-thunk)
and/or
[redux-promise](https://github.com/acdlite/redux-promise)
it tends to bloat the app and it makes unit testing needlessly verbose

`redux-await` tries to solve all of these problems by keeping track of async payloads by means
of a middleware and a reducer keeping track of payload properties statuses. Let's walk
through the development of a TODO app (App 1) that starts without any async and then needs to
start converting action from sync to async. We'll first try only using `redux-thunk` to solve
this (App 2), and then see how to solve this with `redux-await` (App 3)

For the first version of the app we're going to store the todos in localStorage. Here's a simple way we would do it:

## [App1 demo](http://kolodny.github.io/redux-await/app1/)
### App 1
```js
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
```

Looks cool (it's a POC so it's purposely minimal), but let's say you want to start using an API
which is async to store the state, now your app will look something like App 2:

## [App2 demo](http://kolodny.github.io/redux-await/app2/)
### App 2
```js
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Provider, connect } from 'react-redux';
import { applyMiddleware, createStore, combineReducers } from 'redux';
import thunk from 'redux-thunk';
import createLogger from 'redux-logger';

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
      api.save(getState().todos.todos)
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
const todosReducer = (state = initialState, action = {}) => {
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
const reducer = combineReducers({
  todos: todosReducer,
})
const store = applyMiddleware(thunk, createLogger())(createStore)(reducer);

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
      <br />
      <pre>{JSON.stringify(store.getState(), null, 2)}</pre>
    </div>;
  }
}

const ConnectedApp = connect(state => state.todos)(App);

ReactDOM.render(<Provider store={store}><ConnectedApp /></Provider>, document.getElementById('root'));
```

As you can see there's a lot of async logic and state we don't want to have to deal with.
This is 62 more LOC than the first version. Here's how you would do it in App 3 with
`redux-await`:

## [App3 demo](http://kolodny.github.io/redux-await/app3/)
### App 3


```js
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
```

This version is very easy to reason about, in fact you can completely ignore the fact that the app is async at all. The `todosReducer` didn't need to have a single line changed!
Note that this is 107 LOC compared to app2's 125 LOC

## Some pitfalls to watch out for

You must either use this modules `connect` or manually spread the `await` part of the tree over
`mapStateToProps`, you can also choose to name it something other than `await` and spread that
yourself too.

`redux-await` will name the `statuses` and `errors` prop the same as the payload prop so try to be
as descriptive as possible when naming payload props since any payload props collision will
overwrite the `statuses`/`errors` value. For a CRUD app don't always name it something like
`records` because when you're loading `users.records` the app will also think you're loading
`todos.records`

## How it works:

The middleware checks to see if the `AWAIT_MARKER` was set on the action
and if it was then dispatches three events with a `[AWAIT_META_CONTAINER]`
property on the meta property of the action.  
The reducer listens for actions with a meta of `[AWAIT_META_CONTAINER]` and
when found will set the `await` property of the state accordingly.


[npm-image]: https://img.shields.io/npm/v/redux-await.svg?style=flat-square
[npm-url]: https://npmjs.org/package/redux-await
[travis-image]: https://img.shields.io/travis/kolodny/redux-await.svg?style=flat-square
[travis-url]: https://travis-ci.org/kolodny/redux-await
[coveralls-image]: https://img.shields.io/coveralls/kolodny/redux-await.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/kolodny/redux-await
[downloads-image]: http://img.shields.io/npm/dm/redux-await.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/redux-await
