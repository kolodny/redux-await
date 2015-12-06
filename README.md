redux-await
=============

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Downloads][downloads-image]][downloads-url]

Manage async redux actions sanely

## Install

```js
npm install --save redux-await
```

## Usage

This module exposes a middleware and higher order reducer to take care of async state in a redux app. You'll need to:

2. Apply the middleware:

    ```js
    import { middleware as awaitMiddleware } from 'redux-await';
    let createStoreWithMiddleware = applyMiddleware(
      awaitMiddleware
    )(createStore);
    ```

2. Wrap your reducers

    ```js
    const initialState = { users: [] };
    const reducer = (state = initialState, action = {}) => {
      if (action.type === GET_USERS) {
        return { ...state, users: action.payload.users };
      }
      if (action.type === ADD_USER) {
        return { ...state, users: state.users.concat(action.payload.user) };
      }
      return state;
    }

    // old code
    // export default reducer;

    // new code
    import { createReducer } from 'redux-await';
    export default createReducer(reducer);
    ```

Note, if you are using `combineReducers` then you need to wrap each reducer that you are combining independently and not the master reducer that `combineReducers` returns

Now your action creators can contain promises, you just need to add `AWAIT_MARKER` to the action like this:

```js
// old code
//export const getUsers = users => ({
//  type: GET_USERS,
//  payload: {
//    users: users,
//  },
//});
//export const addUser = user => ({
//  type: ADD_USER,
//  payload: {
//    user: user,
//  },
//});

// new code
import { AWAIT_MARKER } from 'redux-await';
export const getUsers = users => ({
 type: GET_USERS,
 AWAIT_MARKER,
 payload: {
   users: api.getUsers(), // returns promise
 },
});
export const addUser = user => ({
 type: ADD_USER,
 AWAIT_MARKER,
 payload: {
   user: api.generateUser(), // returns promise
 },
});
```

Now your containers can hardly need to change at all:

```js
import { getInfo } from 'redux-await'

class Container extends Component {
  render() {
    const { users } = this.props;
    const { statuses, errors } = getInfo(this.props);

    // old code
    //return <div>
    //  <MyTable data={users} />
    //</div>;

    // new code
    return <div>
      { statuses.users === 'pending' && <div>Loading...</div> }
      { statuses.users === 'success' && <MyTable data={users} /> }
      { statuses.users.status === 'failure' && <div>Oops: {errors.users.message}</div> }
      { statuses.user === 'pending' && <div>Saving new user</div> }
      { statuses.user === 'failure' && <div>There was an error saving</div> }
    </div>;
  }
}
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
of a middleware and higher order reducer pair. Let's walk through the development of an app (App 1)
that starts without any async and then needs to start converting action from sync to async. We'll
first try only using `redux-thunk` to solve this (App 2), and then see how to solve this with
`redux-await` (App 3)

Let's talk about use cases. Imagine you had a TODO app (the Hello World of SPAs) and you stored your todos in localStorage, your app might look something like App 1:

## [App1 demo](http://kolodny.github.io/redux-await/app1/)
### App 1
```js
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { Provider, connect } from 'react-redux';
import { applyMiddleware, createStore } from 'redux';
import thunk from 'redux-thunk';

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
      localStorage.todos = JSON.stringify(getState().todos);
      dispatch({ type: SAVE_APP });
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
const store = applyMiddleware(thunk)(createStore)(reducer);

@connect(state => state)
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

ReactDOM.render(<Provider store={store}><App /></Provider>, document.getElementById('root'));
```

Looks cool, but let's say you want to start using an API to store the state, now your app will look something like App 2:

## [App2 demo](http://kolodny.github.io/redux-await/app2/)
### App 2
```js
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
      <br />
      <pre>{JSON.stringify(store.getState(), null, 2)}</pre>
    </div>;
  }
}

ReactDOM.render(<Provider store={store}><App /></Provider>, document.getElementById('root'));
```

As you can see there's a lot of async logic and state we don't want to have to deal with. Here's how you would do it in App 3 with `redux-await`:

## [App3 demo](http://kolodny.github.io/redux-await/app3/)
### App 3


```js
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
```

## Advanced Stuff

By default your reducer is called with the `type` specified in the action only on the success stage, you can listen to pending and fail events too by listening for `getPendingActionType(type)` and `getFailureActionType(type)` types, also your reducer is called every time (pending, success, failure) after the higher order reducer does it's thing, but you can still get the old state as the third parameter (not sure why you would ever need to though)

## How it works:

The middleware checks to see if the `AWAIT_MARKER` was set on the action
and if it was then dispatches three events with a `[AWAIT_META_CONTAINER]`
property on the meta property of the action.  
The reducer listens for actions with a meta of `[AWAIT_META_CONTAINER]` and
when found will populate the `[AWAIT_INFO_CONTAINER]` property of the state.  
`getInfo` just returns the value of `state[AWAIT_INFO_CONTAINER]` which will be an object
with contains a `statuses` and `errors` property or if it's falsly, default to `{ statuses: {}, errors: {} }`

[npm-image]: https://img.shields.io/npm/v/redux-await.svg?style=flat-square
[npm-url]: https://npmjs.org/package/redux-await
[travis-image]: https://img.shields.io/travis/kolodny/redux-await.svg?style=flat-square
[travis-url]: https://travis-ci.org/kolodny/redux-await
[coveralls-image]: https://img.shields.io/coveralls/kolodny/redux-await.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/kolodny/redux-await
[downloads-image]: http://img.shields.io/npm/dm/redux-await.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/redux-await
