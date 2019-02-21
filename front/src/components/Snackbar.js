import React from 'react';
import Snackbar  from '@material-ui/core/Snackbar';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import {setSnackbar, clearSnackbar} from "Actions/app"


class UiSnackbar extends React.PureComponent {
  constructor(props) {
    super(props);
    this.timer = undefined;
  }

  componentWillUnmount() {
    clearTimeout(this.timer);
  }

  handleRequestClose = () => {
    this.props.clearSnackbar()
  };

  render() {
    return (
      <div>
          <Snackbar
            anchorOrigin={{ vertical: 'top', horizontal: 'right'}}
            open={this.props.open}
            classes={{root: 'snackbar-root'}}
            message={this.props.message}
            autoHideDuration={3000}
            onClose={this.handleRequestClose}
          />
      </div>
    );
  }
}


function mapStateToProps(state) {
  return {
    message: state.app.snackbar.message,
    open: state.app.snackbar.open
  }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators({setSnackbar, clearSnackbar}, dispatch);
}

export default connect(mapStateToProps, mapDispatchToProps)(UiSnackbar);