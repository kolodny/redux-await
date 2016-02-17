import { connect } from 'react-redux';

// can't really test this higher order function without overwriting the require cache
/* istanbul ignore next */
export default (mapStateToProps, ...args) => {
  return connect((state, ownProps) => {
    const props = mapStateToProps(state, ownProps);
    const { statuses, errors } = state.await;
    return { ...props, statuses, errors };
  }, ...args);
}
