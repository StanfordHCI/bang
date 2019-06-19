/** Table.js
 *  front-end / code scrap
 * 
 *  helper methods & jsx for displaying a table that knows its striped/hover
 *  status...as far as I can see this is exactly the same as calling table
 *  from reactstrap directly 
 * 
 *  called by:
 *    1. unused; devs call Table directly from reactstrap instead  
 */

import React, {PureComponent} from 'react';
import {Table} from 'reactstrap';
import PropTypes from 'prop-types';

export default class TableComponent extends PureComponent {
  static propTypes = {
    striped: PropTypes.bool,
    hover: PropTypes.bool,
    responsive: PropTypes.bool,
    className: PropTypes.string
  };
  
  render() {
    return (
      <Table className={this.props.className} striped={this.props.striped} hover={this.props.hover}
             responsive={this.props.responsive}>
        {this.props.children}
      </Table>
    )
  }
}