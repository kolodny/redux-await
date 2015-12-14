import { connect } from 'react-redux';

export default (mapStateToProps, ...args) => {
  return connect(state => {
    const props = mapStateToProps(state);
    const { statuses, errors } = state.await;
    return { ...props, statuses, errors };
  }, ...args);
}
