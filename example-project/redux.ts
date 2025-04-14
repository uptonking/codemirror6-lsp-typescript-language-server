/**
 * [Finally understand Redux by building your own Store](https://ultimatecourses.com/blog/redux-typescript-store)
 */
export class Store {
  private subscribers: Function[];
  private reducers: { [key: string]: Function };
  private state: { [key: string]: any };

  constructor(reducers = {}, initialState = {}) {
    this.subscribers = [];
    this.reducers = reducers;
    this.state = this.reduce(initialState, {});
  }

  get value() {
    return this.state;
  }

  subscribe(fn) {
    this.subscribers = [...this.subscribers, fn];
    fn(this.value);
    return () => {
      this.subscribers = this.subscribers.filter((sub) => sub !== fn);
    };
  }

  dispatch(action) {
    this.state = this.reduce(this.state, action);
    this.subscribers.forEach((fn) => fn(this.value));
  }

  private reduce(state, action) {
    const newState = {};
    for (const prop in this.reducers) {
      newState[prop] = this.reducers[prop](state[prop], action);
    }
    return newState;
  }
}

let stores = new Store(
  {
    setShowMenu: (state, action) => {
      if (action.type === 'SHOW_MENU') {
        return { ...state, showMenu: action.payload };
      }
      return state;
    },
  },
  {
    showMenu: 'fileTree',
  },
);

stores;
