import React, { Component } from 'react';

class BodyData extends Component {

    state = {
        query: '',
        data: [],
        searchString:[]
    }

    handleInputChange = (event) => {
        this.setState({
            query: event.target.value
        },()=>{
            this.filterArray();
        })

    }


    filterArray = () => {
        let searchString = this.state.query;

        if(searchString.length > 0){
            // console.log(responseData[i].name);
            const newList = this.state.admin.userList.filter(x => x.mturkId.toString().indexOf(searchString) > -1);
            this.setState({
                responseData
            })
        }

    }

    render() {
        return (
            <div className="searchForm">
                <form>
                    <input type="text" id="filter" placeholder="Search for..."  onChange={this.handleInputChange}/>
                </form>
                <div>
                    {
                        this.state.responseData.map((i) =>
                            <p>{i.name}</p>
                        )
                    }
                </div>
            </div>
        )
    }
}


export default BodyData;