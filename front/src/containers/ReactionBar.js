import React from 'react'; 
import Reaction from '../components/Reaction'

class ReactionBar extends React.Component{
    constructor(props) {
        super(props)
        this.state = {
            smiles: 2,
            mehs: 0,
            frowns: 1,
            smileType: "1",
            mehType: "0",
            frownType: "-1",
            isClicked: ""
        }
        this.handleClick = this.handleClick.bind(this)
    }

    handleClick(reactionType) {
        let newIsClicked = ""
        let newSmiles = this.state.smiles
        let newMehs = this.state.mehs
        let newFrowns = this.state.frowns
        
        //unvoting a reaction
        if (this.state.isClicked === reactionType) {
            if (reactionType === "1") {
                newSmiles -= 1
            } else if (reactionType === "0") {
                newMehs -= 1
            } else {
                newFrowns -= 1
            }
        }
        else {
            if (reactionType === "1") {
                newSmiles += 1
            } else if (reactionType === "0") {
                newMehs += 1
            } else {
                newFrowns += 1
            }
            newIsClicked = reactionType
            // UPDATE THE DATABASE!!!!!!
            //if voted previously 
            if(this.state.isClicked !== "") {
                if (this.state.isClicked === "1") {
                    newSmiles -= 1
                } else if (this.state.isClicked === "0") {
                    newMehs -= 1
                } else {
                    newFrowns -= 1
                }
            }
        }
        this.setState({...this.state, smiles: newSmiles, mehs: newMehs, frowns: newFrowns, isClicked: newIsClicked})
    }

    render() {
        return (
            <div>
                <Reaction 
                    isClicked={this.state.isClicked === this.state.smileType} 
                    reactionType={this.state.smileType} 
                    value={this.state.smiles} 
                    clickedIcon={"fas fa-grin-beam"} 
                    notClickedIcon={"far fa-grin-beam"} 
                    handleClick={this.handleClick}/>
                <Reaction 
                    isClicked={this.state.isClicked === this.state.mehType} 
                    reactionType={this.state.mehType} 
                    value={this.state.mehs} 
                    clickedIcon={"fas fa-meh"} 
                    notClickedIcon={"far fa-meh"} 
                    handleClick={this.handleClick}/>
                <Reaction 
                    isClicked={this.state.isClicked === this.state.frownType} 
                    reactionType={this.state.frownType} 
                    value={this.state.frowns} 
                    clickedIcon={"fas fa-frown"} 
                    notClickedIcon={"far fa-frown"} 
                    handleClick={this.handleClick}/>
            </div>
        )
    }
}

export default ReactionBar; 