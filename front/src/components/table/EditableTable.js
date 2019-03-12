import React, {PureComponent} from 'react';
import ReactDataGrid from 'react-data-grid';
import update from 'immutability-helper';
import PropTypes from 'prop-types';

export default class EditableTable extends PureComponent {
  static propTypes = {
    heads: PropTypes.array.isRequired,
    rows: PropTypes.array.isRequired,
    enableRowSelect: PropTypes.bool
  };
  
  constructor(props, context) {
    super(props, context);
    let originalRows = this.props.rows;
    let rows = originalRows.slice(0, 10);
    this.state = {rows, originalRows};
    this.rowGetter = this.rowGetter.bind(this);
    this.handleGridRowsUpdated = this.handleGridRowsUpdated.bind(this);
    this.handleGridSort = this.handleGridSort.bind(this);
  }
  
  componentDidMount(){
  
  }
  
  handleGridRowsUpdated = ({fromRow, toRow, updated}) => {
    let rows = this.state.rows.slice();
    
    for (let i = fromRow; i <= toRow; i++) {
      let rowToUpdate = rows[i];
      rows[i] = update(rowToUpdate, {$merge: updated});
    }
    
    this.setState({rows});
  };
  
  handleGridSort = (sortColumn, sortDirection) => {
    
    const comparer = (a, b) => {
      if (sortDirection === 'ASC') {
        return (a[sortColumn] > b[sortColumn]) ? 1 : -1;
      } else if (sortDirection === 'DESC') {
        return (a[sortColumn] < b[sortColumn]) ? 1 : -1;
      }
    };
    
    let sortRows = this.state.originalRows.slice(0);
    const rows = sortDirection === 'NONE' ? this.state.originalRows.slice(0, 10) : sortRows.sort(comparer).slice(0, 10);
    
    this.setState({rows});
  };
  
  rowGetter = (i) => {
    return this.state.rows[i];
  };
  
  render() {
    return (
      <div className='table'>
        <ReactDataGrid
          onGridSort={this.handleGridSort}
          enableCellSelect={true}
          columns={this.props.heads}
          rowGetter={this.rowGetter}
          rowsCount={this.state.rows.length}
          onGridRowsUpdated={this.handleGridRowsUpdated}
          rowHeight={44}
          enableRowSelect={this.props.enableRowSelect}
          minColumnWidth={100}
        />
      </div>
    );
  }
}
