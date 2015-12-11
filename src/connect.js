import { connect } from 'react-redux';
import { AWAIT_INFO_CONTAINER } from './';

export default (mapStateToProps, ...args) => {
  return connect(state => {
    const props = mapStateToProps(state);
    const { statuses, errors } = state.await;
    return { ...props, statuses, errors };
  }, ...args);
}
